resource "azurerm_resource_group" "ai_playground_rg" {
  name     = "${var.prefix}-ai-playground-rg"
  location = "Germany West Central"
}

resource "azurerm_cognitive_account" "ai_playground_account_llm" {
  name                = "${var.prefix}-llm-account-playground"
  location            = azurerm_resource_group.ai_playground_rg.location
  resource_group_name = azurerm_resource_group.ai_playground_rg.name
  kind                = "AIServices"
  sku_name            = "S0"
}

resource "azurerm_cognitive_deployment" "ai_playground_deployment_llm" {
  name                 = "${var.prefix}-llm-deployment-playground"
  cognitive_account_id = azurerm_cognitive_account.ai_playground_account_llm.id

  sku {
    name     = "GlobalStandard"
    capacity = 100
  }

  model {
    format  = "OpenAI"
    name    = "gpt-5-mini"
    version = "2025-08-07"
  }
}

resource "azurerm_cognitive_deployment" "ai_playground_deployment_image" {
  name                 = "${var.prefix}-image-deployment-playground"
  cognitive_account_id = azurerm_cognitive_account.ai_playground_account_llm.id

  sku {
    name     = "GlobalStandard"
    capacity = 100
  }

  model {
    format  = "OpenAI"
    name    = "gpt-image-1-mini"
    version = "2025-08-07"
  }
}
