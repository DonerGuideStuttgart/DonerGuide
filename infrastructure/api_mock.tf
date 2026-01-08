resource "azurerm_container_app_environment" "api_mock_env" {
  name                  = "api-mock-env"
  location              = azurerm_resource_group.main.location
  resource_group_name   = azurerm_resource_group.main.resource_group_name
  public_network_access = "Enabled"
}

resource "azurerm_container_app" "api_mock" {
  container_app_environment_id = azurerm_container_app_environment.api_mock_env.id
  name                         = "api-mock"
  location                     = azurerm_resource_group.main.location
  resource_group_name          = azurerm_resource_group.main.resource_group_name
  revision_mode                = "Single"

  template {
    container {
      cpu    = 0.25
      image  = "ghcr.io/donerguidestuttgart/donerguide/api-mock:main"
      memory = "0.5Gi"
      name   = "api-mock-container"
    }

    max_replicas = 1
    min_replicas = 0
  }

  ingress {
    allow_insecure_connections = true
    external_enabled           = true
    target_port                = 3001

    cors {
      allowed_origins = [
        "https://doenerguide-stuttgart.de/",
        "http://doenerguide-stuttgart.de/"
      ]
    }

    traffic_weight {
      percentage = 100
    }
  }
}
