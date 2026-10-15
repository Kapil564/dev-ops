variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}


variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "taskboard-eks"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}
