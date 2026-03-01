resource "azurerm_storage_account" "storage_account_classified_images" {
  name                     = "storageclassifiedimages"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  local_user_enabled       = false
}

resource "azurerm_storage_container" "sc_classified_images" {
  name                  = "classifiedimages"
  storage_account_id    = azurerm_storage_account.storage_account_classified_images.id
  container_access_type = "private"
}

resource "azurerm_storage_account" "storage_account_generated_images" {
  name                            = "storagegeneratedimages"
  resource_group_name             = azurerm_resource_group.rg.name
  location                        = azurerm_resource_group.rg.location
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  local_user_enabled              = false
  allow_nested_items_to_be_public = true
  public_network_access_enabled   = true
}

resource "azurerm_storage_container" "sc_generated_images" {
  name                  = "generatedimages"
  storage_account_id    = azurerm_storage_account.storage_account_generated_images.id
  container_access_type = "blob"
}

resource "azurerm_storage_account" "storage_account_functions" {
  name                     = "donerfunctionsstorage"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  local_user_enabled       = false
}
