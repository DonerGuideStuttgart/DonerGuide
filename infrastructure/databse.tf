resource "azurerm_cosmosdb_account" "cosmosdb_account" {
  name                = "${var.prefix}-cosmosdb-account"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  offer_type          = "Standard"
  free_tier_enabled   = true

  capacity {
    total_throughput_limit = "1000"
  }

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = azurerm_resource_group.rg.location
    failover_priority = 0
  }
}

resource "azurerm_cosmosdb_sql_database" "database" {
  name                = "doner-guide"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmosdb_account.name
}

resource "azurerm_cosmosdb_sql_container" "places_container" {
  name                  = "Places"
  resource_group_name   = azurerm_resource_group.rg.name
  account_name          = azurerm_cosmosdb_account.cosmosdb_account.name
  database_name         = azurerm_cosmosdb_sql_database.database.name
  partition_key_paths   = ["/id"]
  partition_key_version = "2"
}

resource "azurerm_cosmosdb_sql_container" "grid_cells_container" {
  name                  = "GridCells"
  resource_group_name   = azurerm_resource_group.rg.name
  account_name          = azurerm_cosmosdb_account.cosmosdb_account.name
  database_name         = azurerm_cosmosdb_sql_database.database.name
  partition_key_paths   = ["/id"]
  partition_key_version = "2"

  indexing_policy {
    indexing_mode = "consistent"
    included_path {
      path = "/*"
    }
  }
}

resource "azurerm_cosmosdb_sql_role_definition" "function_cosmos_access" {
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmosdb_account.name
  name                = "FunctionCosmosAccess"
  assignable_scopes   = [azurerm_cosmosdb_account.cosmosdb_account.id]

  permissions {
    data_actions = [
      "Microsoft.DocumentDB/databaseAccounts/readMetadata",
      "Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/*",
      "Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/items/*",
      "Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/executeQuery",
      "Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/storedProcedures/*",
    ]
  }
}
