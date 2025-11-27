resource "azurerm_cognitive_account" "vision_free" {
  name                = "${var.prefix}-vision-free"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  kind                = "ComputerVision"
  sku_name            = "F0"
}

resource "azurerm_cognitive_account" "vision_paid" {
  name                = "${var.prefix}-vision-paid"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  kind                = "ComputerVision"
  sku_name            = "S1"
}

resource "azurerm_cognitive_account" "account_llm" {
  name                = "${var.prefix}-llm-account"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  kind                = "AIServices"
  sku_name            = "S0"
}

resource "azurerm_cognitive_deployment" "deployment_llm" {
  name                 = "${var.prefix}-llm-deployment"
  cognitive_account_id = azurerm_cognitive_account.account_llm.id

  sku {
    name = "GlobalStandard"
  }

  model {
    format  = "xAI"
    name    = "grok-4-fast-reasoning"
    version = "1"
  }
}
