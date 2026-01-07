resource "azurerm_resource_group" "rg_playgound" {
  name     = "${var.prefix}-rg-playgound"
  location = "germanywestcentral"
}

resource "azurerm_cognitive_account" "account_llm_playgound" {
  name                = "${var.prefix}-llm-account-playgound"
  location            = azurerm_resource_group.rg_playgound.location
  resource_group_name = azurerm_resource_group.rg_playgound.name
  kind                = "AIServices"
  sku_name            = "S0"
}

resource "azurerm_cognitive_deployment" "deployment_llm_playgound" {
  name                 = "${var.prefix}-llm-deployment-playgound"
  cognitive_account_id = azurerm_cognitive_account.account_llm_playgound.id

  sku {
    name     = "GlobalStandard"
    capacity = 25
  }

  model {
    format  = "OpenAI"
    name    = "gpt-5-mini"
    version = "2025-08-07"
  }
}

resource "azurerm_key_vault" "kv_playgound" {
  name                = "${var.prefix}-kv-playgound"
  location            = azurerm_resource_group.rg_playgound.location
  resource_group_name = azurerm_resource_group.rg_playgound.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"
}

resource "azurerm_key_vault_access_policy" "kv_access_playgound" {
  key_vault_id = azurerm_key_vault.kv_playgound.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azurerm_client_config.current.object_id

  key_permissions = [
    "Create",
    "Get",
    "Delete",
    "Purge",
    "GetRotationPolicy",
  ]
}

resource "azurerm_storage_account" "sa_playgound" {
  name                     = "${var.prefix}saplaygound"
  resource_group_name      = azurerm_resource_group.rg_playgound.name
  location                 = azurerm_resource_group.rg_playgound.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}


resource "azurerm_ai_services" "ai_service_playgound" {
  name                = "${var.prefix}-ai-service-playgound"
  location            = azurerm_resource_group.rg_playgound.location
  resource_group_name = azurerm_resource_group.rg_playgound.name
  sku_name            = "S0"
}


resource "azurerm_ai_foundry" "ai_foundry_playgound" {
  name                = "${var.prefix}-ai-foundry-playgound"
  location            = azurerm_resource_group.rg_playgound.location
  resource_group_name = azurerm_resource_group.rg_playgound.name
  storage_account_id  = azurerm_storage_account.sa_playgound.id
  key_vault_id        = azurerm_key_vault.kv_playgound.id

  identity {
    type = "SystemAssigned"
  }
}

resource "azurerm_ai_foundry_project" "ai_foundry_project_playgound" {
  name               = "${var.prefix}-playgound"
  location           = azurerm_resource_group.rg_playgound.location
  ai_services_hub_id = azurerm_ai_foundry.ai_foundry_playgound.id
}
