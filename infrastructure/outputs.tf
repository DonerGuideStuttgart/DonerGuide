output "static_web_app_api_token" {
  value       = azurerm_static_web_app.frontend_app.api_token
  description = "The API token for the static web app."
  sensitive   = true
}
