resource "azurerm_service_plan" "service_plan" {
  name                = "${var.prefix}-function-app-sp"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  os_type             = "Linux"
  sku_name            = "Y1"
}


resource "azurerm_linux_function_app" "place-search-function" {
  name                = "${var.prefix}-place-search-func"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  service_plan_id     = azurerm_service_plan.service_plan.id

  site_config {
    application_stack {
      node_version = "22"
    }
  }

  storage_uses_managed_identity = true
  storage_account_name          = azurerm_storage_account.storage_account_functions.name

  identity {
    type = "SystemAssigned"
  }
}

resource "azurerm_role_assignment" "function_app_role_assignment" {
  scope                = azurerm_storage_account.storage_account_functions.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_linux_function_app.place-search-function.identity[0].principal_id
}


resource "azurerm_linux_function_app" "image-classifier-function" {
  name                = "${var.prefix}-image-classifier-func"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  service_plan_id     = azurerm_service_plan.service_plan.id

  site_config {
    application_stack {
      node_version = "22"
    }
  }

  storage_uses_managed_identity = true
  storage_account_name          = azurerm_storage_account.storage_account_functions.name

  identity {
    type = "SystemAssigned"
  }
}


resource "azurerm_role_assignment" "function_app_role_assignment_image_classifier" {
  scope                = azurerm_storage_account.storage_account_functions.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_linux_function_app.image-classifier-function.identity[0].principal_id
}

resource "azurerm_linux_function_app" "llm-analyzer-function" {
  name                = "${var.prefix}-llm-analyzer-func"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  service_plan_id     = azurerm_service_plan.service_plan.id

  site_config {
    application_stack {
      node_version = "22"
    }
  }

  storage_uses_managed_identity = true
  storage_account_name          = azurerm_storage_account.storage_account_functions.name

  identity {
    type = "SystemAssigned"
  }
}

resource "azurerm_role_assignment" "function_app_role_assignment_llm_analyzer" {
  scope                = azurerm_storage_account.storage_account_functions.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_linux_function_app.llm-analyzer-function.identity[0].principal_id
}
