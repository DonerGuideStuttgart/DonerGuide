output "static_web_app_api_token" {
  value       = azurerm_static_web_app.frontend_app.api_key
  description = "The API token for the static web app."
  sensitive   = true
}

output "api_mock_url" {
  value       = "https://${azurerm_container_app.api_mock.latest_revision_fqdn}"
  description = "The default domain of the API mock container app environment."
}
