resource "azurerm_static_web_app" "frontend_app" {
  name                         = "${var.prefix}-static-web-app"
  location                     = azurerm_resource_group.rg.location
  resource_group_name          = azurerm_resource_group.rg.name
  preview_environments_enabled = false


  lifecycle {
    ignore_changes = [
      repository_url,
      repository_branch,
    ]
  }
}

resource "azurerm_static_web_app_custom_domain" "frontend_domain" {
  domain_name       = "doenerguide-stuttgart.de"
  static_web_app_id = azurerm_static_web_app.frontend_app.id
  validation_type   = "dns-txt-token"
}

resource "cloudflare_dns_record" "frontend_cname" {
  zone_id = "b2a8a9947bfdebca46980e4684d1762e"
  name    = "@"
  type    = "CNAME"
  ttl     = 1
  content = azurerm_static_web_app.frontend_app.default_host_name
}

resource "cloudflare_dns_record" "frontend_verification" {
  zone_id = "b2a8a9947bfdebca46980e4684d1762e"
  name    = "@"
  type    = "TXT"
  ttl     = 1
  content = azurerm_static_web_app_custom_domain.frontend_domain.validation_token

  depends_on = [azurerm_static_web_app_custom_domain.frontend_domain]
  count      = azurerm_static_web_app_custom_domain.frontend_domain.validation_token != "" ? 1 : 0
}

resource "cloudflare_dns_record" "api_cname" {
  zone_id = "b2a8a9947bfdebca46980e4684d1762e"
  name    = "api"
  type    = "CNAME"
  ttl     = 1
  content = azurerm_linux_function_app.shops-function.default_hostname
}

resource "cloudflare_dns_record" "api_verification" {
  zone_id = "b2a8a9947bfdebca46980e4684d1762e"
  name    = "asuid.api"
  type    = "TXT"
  ttl     = 1
  content = azurerm_linux_function_app.shops-function.custom_domain_verification_id

  depends_on = [azurerm_linux_function_app.shops-function]
  count      = azurerm_linux_function_app.shops-function.custom_domain_verification_id != "" ? 1 : 0
}

