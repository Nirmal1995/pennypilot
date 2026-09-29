terraform {
  required_version = ">= 1.6"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }

  # Recommended once the bucket exists: keep state in GCS instead of on your laptop.
  # backend "gcs" {
  #   bucket = "your-tf-state-bucket"
  #   prefix = "pennypilot"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
