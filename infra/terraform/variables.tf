variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "Region for Artifact Registry and the VPC subnet"
  type        = string
  default     = "europe-west1"
}

variable "zone" {
  description = "Zone for the zonal GKE cluster (one zonal cluster is covered by the GKE free tier credit)"
  type        = string
  default     = "europe-west1-b"
}

variable "cluster_name" {
  description = "GKE cluster name"
  type        = string
  default     = "pennypilot-gke"
}

variable "machine_type" {
  description = "Node machine type"
  type        = string
  default     = "e2-standard-2"
}

variable "node_count" {
  description = "Number of nodes in the pool"
  type        = number
  default     = 1
}

variable "use_spot" {
  description = "Use Spot VMs for nodes. Much cheaper, but nodes can be reclaimed. Fine for a lab."
  type        = bool
  default     = true
}
