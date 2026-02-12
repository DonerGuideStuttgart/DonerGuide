variable "prefix" {
  description = "Prefix for all resources"
  type        = string
  default     = "donerguide"
}

variable "cloudflare_api_token" {
  description = "API token for Cloudflare provider"
  type        = string
}

variable "place_search_cron" {
  description = "Cron expression for place search function"
  type        = string
  default     = "0 0 * * * *"
}
