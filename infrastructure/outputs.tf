output "static_web_app_api_token" {
  value       = azurerm_static_web_app.frontend_app.api_key
  description = "The API token for the static web app."
  sensitive   = true
}

output "api_mock_url" {
  value       = azurerm_container_app_environment.api_mock_env.default_domain
  description = "The default domain of the API mock container app environment."
}
