output "ingress_ip" {
  description = "Point your domain's A record here (or browse to it directly over HTTP)"
  value       = google_compute_global_address.ingress.address
}

output "registry" {
  description = "Docker registry path used by the Jenkinsfile"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.images.repository_id}"
}

output "cluster_name" {
  value = google_container_cluster.main.name
}

output "cluster_zone" {
  value = google_container_cluster.main.location
}

output "jenkins_service_account" {
  description = "Create a key for this account and store it in Jenkins as the gcp-sa-key credential"
  value       = google_service_account.jenkins.email
}

output "get_credentials_command" {
  value = "gcloud container clusters get-credentials ${google_container_cluster.main.name} --zone ${google_container_cluster.main.location} --project ${var.project_id}"
}
