output "static_web_app_api_token" {
  value       = azurerm_static_web_app.frontend_app.api_key
  description = "The API token for the static web app."
  sensitive   = true
}

output "api_mock_url" {
  value       = "https://${azurerm_container_app.api_mock.latest_revision_fqdn}"
  description = "The default domain of the API mock container app environment."
}

output "api_url" {
  value       = "https://${azurerm_app_service_custom_hostname_binding.shops_function_hostname.hostname}"
  description = "The default domain of the API container app environment."
}

output "function_app_name_place_search" {
  value       = azurerm_linux_function_app.place-search-function.name
  description = "The name of the place search function app."
}

output "function_app_name_image_classifier" {
  value       = azurerm_linux_function_app.image-classifier-function.name
  description = "The name of the image classifier function app."
}

output "function_app_name_llm_analyzer" {
  value       = azurerm_linux_function_app.llm-analyzer-function.name
  description = "The name of the llm analyzer function app."
}

output "function_app_name_shops" {
  value       = azurerm_linux_function_app.shops-function.name
  description = "The name of the shops function app."
}
