variable "s3_endpoint" {
  type        = string
  description = "Endpoint to S3"
}

variable "s3_access_key" {
  type        = string
  sensitive   = true 
}

variable "s3_secret_key" {
  type        = string
  sensitive   = true
}

variable "bucket_name" {
  type = string
}

variable "cors_allowed_origins" {
  type        = list(string)
  description = "Accepted domains for CORS in S3"
  default     = ["http://localhost:5173", "http://localhost:3000"]
}