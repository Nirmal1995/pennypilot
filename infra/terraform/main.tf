locals {
  services = [
    "compute.googleapis.com",
    "container.googleapis.com",
    "artifactregistry.googleapis.com",
    "iam.googleapis.com",
  ]
}

resource "google_project_service" "apis" {
  for_each           = toset(local.services)
  service            = each.value
  disable_on_destroy = false
}

# ---------- Network ----------
resource "google_compute_network" "vpc" {
  name                    = "pennypilot-vpc"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.apis]
}

resource "google_compute_subnetwork" "gke" {
  name          = "pennypilot-gke"
  region        = var.region
  network       = google_compute_network.vpc.id
  ip_cidr_range = "10.10.0.0/20"

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.20.0.0/16"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.30.0.0/20"
  }
}

# Static IP referenced by the Ingress annotation kubernetes.io/ingress.global-static-ip-name
resource "google_compute_global_address" "ingress" {
  name       = "pennypilot-ip"
  depends_on = [google_project_service.apis]
}

# ---------- Artifact Registry ----------
resource "google_artifact_registry_repository" "images" {
  location      = var.region
  repository_id = "pennypilot"
  format        = "DOCKER"
  description   = "PennyPilot container images"

  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"
    most_recent_versions {
      keep_count = 15
    }
  }

  cleanup_policies {
    id     = "delete-old"
    action = "DELETE"
    condition {
      older_than = "2592000s" # 30 days
    }
  }

  depends_on = [google_project_service.apis]
}

# ---------- Service accounts ----------
resource "google_service_account" "gke_nodes" {
  account_id   = "pennypilot-gke-nodes"
  display_name = "PennyPilot GKE nodes"
}

resource "google_project_iam_member" "node_roles" {
  for_each = toset([
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/monitoring.viewer",
    "roles/stackdriver.resourceMetadata.writer",
    "roles/artifactregistry.reader",
  ])
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

# Jenkins uses this identity to push images and deploy. Create its key with gcloud (see README),
# so the private key never lands in Terraform state.
resource "google_service_account" "jenkins" {
  account_id   = "jenkins-deployer"
  display_name = "Jenkins CI/CD deployer"
}

resource "google_artifact_registry_repository_iam_member" "jenkins_push" {
  location   = google_artifact_registry_repository.images.location
  repository = google_artifact_registry_repository.images.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.jenkins.email}"
}

resource "google_project_iam_member" "jenkins_deploy" {
  project = var.project_id
  role    = "roles/container.developer"
  member  = "serviceAccount:${google_service_account.jenkins.email}"
}

# ---------- GKE ----------
resource "google_container_cluster" "main" {
  name     = var.cluster_name
  location = var.zone

  network    = google_compute_network.vpc.id
  subnetwork = google_compute_subnetwork.gke.id

  remove_default_node_pool = true
  initial_node_count       = 1
  deletion_protection      = false

  networking_mode = "VPC_NATIVE"
  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  release_channel {
    channel = "REGULAR"
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  addons_config {
    http_load_balancing {
      disabled = false
    }
    horizontal_pod_autoscaling {
      disabled = false
    }
  }

  depends_on = [google_project_service.apis]
}

resource "google_container_node_pool" "primary" {
  name       = "primary"
  cluster    = google_container_cluster.main.id
  location   = var.zone
  node_count = var.node_count

  node_config {
    machine_type    = var.machine_type
    spot            = var.use_spot
    disk_size_gb    = 30
    disk_type       = "pd-balanced"
    service_account = google_service_account.gke_nodes.email
    oauth_scopes    = ["https://www.googleapis.com/auth/cloud-platform"]

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    labels = {
      app = "pennypilot"
    }
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }
}
