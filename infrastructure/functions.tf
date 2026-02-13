resource "azurerm_service_plan" "service_plan" {
  name                = "${var.prefix}-function-app-sp"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  os_type             = "Linux"
  sku_name            = "Y1"
}

/**
 * Place Search Function App
 */

resource "azurerm_linux_function_app" "place-search-function" {
  name                                     = "${var.prefix}-place-search-func"
  location                                 = azurerm_resource_group.rg.location
  resource_group_name                      = azurerm_resource_group.rg.name
  service_plan_id                          = azurerm_service_plan.service_plan.id
  ftp_publish_basic_authentication_enabled = false
  public_network_access_enabled            = true

  site_config {
    application_stack {
      node_version = "22"
    }
    application_insights_connection_string = azurerm_application_insights.application_insights_place_search.connection_string

    cors {
      allowed_origins = ["https://portal.azure.com"]
    }
  }

  storage_uses_managed_identity = true
  storage_account_name          = azurerm_storage_account.storage_account_functions.name

  identity {
    type = "SystemAssigned"
  }

  app_settings = {
    "PLACE_SEARCH_GRID_VERSION"                                          = "v2"
    "PLACE_SEARCH_CRON"                                                  = var.place_search_cron
    "PLACE_SEARCH_DRY_RUN"                                               = false
    "PLACE_SEARCH_STUTTGART_MIN_LAT"                                     = "48.692"
    "PLACE_SEARCH_STUTTGART_MIN_LON"                                     = "9.038"
    "PLACE_SEARCH_STUTTGART_MAX_LAT"                                     = "48.866"
    "PLACE_SEARCH_STUTTGART_MAX_LON"                                     = "9.315"
    "GOOGLE_PLACES_API_KEY"                                              = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault.kv.vault_uri}/secrets/google-maps-places-api-key)"
    "PLACE_SEARCH_COSMOSDB_ENDPOINT"                                     = azurerm_cosmosdb_account.cosmosdb_account.endpoint
    "PLACE_SEARCH_COSMOSDB_DATABASE_NAME"                                = azurerm_cosmosdb_sql_database.database.name
    "PLACE_SEARCH_COSMOSDB_CONTAINER_NAME"                               = azurerm_cosmosdb_sql_container.places_container.name
    "PLACE_SEARCH_SERVICEBUS_QUEUE_NAME"                                 = azurerm_servicebus_queue.sb_queue_places.name
    "PLACE_SEARCH_SERVICEBUS_CONNECTION_STRING__fullyQualifiedNamespace" = "${azurerm_servicebus_namespace.sb_namespace.name}.servicebus.windows.net"
  }

  lifecycle {
    ignore_changes = [
      tags,
      app_settings["WEBSITE_RUN_FROM_PACKAGE"],
      app_settings["WEBSITE_ENABLE_SYNC_UPDATE_SITE"],
      site_config[0].application_stack
    ]
  }

}

resource "azurerm_role_assignment" "function_app_role_assignment" {
  scope                = azurerm_storage_account.storage_account_functions.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_linux_function_app.place-search-function.identity[0].principal_id
}

resource "azurerm_role_assignment" "function_app_role_assignment_key_vault" {
  scope                = azurerm_key_vault.kv.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_linux_function_app.place-search-function.identity[0].principal_id
}

/**
 * Image Classifier Function App
 */


resource "azurerm_linux_function_app" "image-classifier-function" {
  name                                     = "${var.prefix}-image-classifier-func"
  location                                 = azurerm_resource_group.rg.location
  resource_group_name                      = azurerm_resource_group.rg.name
  service_plan_id                          = azurerm_service_plan.service_plan.id
  ftp_publish_basic_authentication_enabled = false
  public_network_access_enabled            = false

  site_config {
    application_stack {
      node_version = "22"
    }
    application_insights_connection_string = azurerm_application_insights.application_insights_image_classifier.connection_string

    cors {
      allowed_origins = ["https://portal.azure.com"]
    }
  }

  storage_uses_managed_identity = true
  storage_account_name          = azurerm_storage_account.storage_account_functions.name

  identity {
    type = "SystemAssigned"
  }

  app_settings = {
    "IMAGE_CLASSIFIER_COSMOSDB_ENDPOINT"                                            = azurerm_cosmosdb_account.cosmosdb_account.endpoint
    "IMAGE_CLASSIFIER_COSMOSDB_DATABASE_NAME"                                       = azurerm_cosmosdb_sql_database.database.name
    "IMAGE_CLASSIFIER_COSMOSDB_CONTAINER_NAME"                                      = azurerm_cosmosdb_sql_container.places_container.name
    "IMAGE_CLASSIFIER_SERVICEBUS_QUEUE_NAME_INPUT"                                  = azurerm_servicebus_queue.sb_queue_places.name
    "IMAGE_CLASSIFIER_SERVICEBUS_CONNECTION_STRING_INPUT__fullyQualifiedNamespace"  = "${azurerm_servicebus_namespace.sb_namespace.name}.servicebus.windows.net"
    "IMAGE_CLASSIFIER_SERVICEBUS_QUEUE_NAME_OUTPUT"                                 = azurerm_servicebus_queue.sb_queue_images.name
    "IMAGE_CLASSIFIER_SERVICEBUS_CONNECTION_STRING_OUTPUT__fullyQualifiedNamespace" = "${azurerm_servicebus_namespace.sb_namespace.name}.servicebus.windows.net"
    "IMAGE_CLASSIFIER_STORAGE_ENDPOINT"                                             = azurerm_storage_account.storage_account_functions.primary_blob_endpoint
    "IMAGE_CLASSIFIER_STORAGE_ACCOUNT_NAME"                                         = azurerm_storage_account.storage_account_functions.name
    "IMAGE_CLASSIFIER_STORAGE_CONTAINER_NAME"                                       = azurerm_storage_container.sc_classified_images.name
    "IMAGE_CLASSIFIER_VISION_ENDPOINT"                                              = azurerm_cognitive_account.vision_paid.endpoint
  }

  lifecycle {
    ignore_changes = [
      tags,
      app_settings["WEBSITE_RUN_FROM_PACKAGE"],
      app_settings["WEBSITE_ENABLE_SYNC_UPDATE_SITE"],
      site_config[0].application_stack
    ]
  }
}

resource "azurerm_role_assignment" "function_app_role_assignment_image_classifier" {
  scope                = azurerm_storage_account.storage_account_functions.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_linux_function_app.image-classifier-function.identity[0].principal_id
}

resource "azurerm_role_assignment" "image_classifier_vision_role" {
  scope                = azurerm_cognitive_account.vision_paid.id
  role_definition_name = "Cognitive Services User"
  principal_id         = azurerm_linux_function_app.image-classifier-function.identity[0].principal_id
}

/**
 * LLM Analyzer Function App
 */

resource "azurerm_linux_function_app" "llm-analyzer-function" {
  name                                     = "${var.prefix}-llm-analyzer-func"
  location                                 = azurerm_resource_group.rg.location
  resource_group_name                      = azurerm_resource_group.rg.name
  service_plan_id                          = azurerm_service_plan.service_plan.id
  ftp_publish_basic_authentication_enabled = false
  public_network_access_enabled            = false

  site_config {
    application_stack {
      node_version = "22"
    }
    application_insights_connection_string = azurerm_application_insights.application_insights_llm_analyzer.connection_string

    cors {
      allowed_origins = ["https://portal.azure.com"]
    }
  }

  storage_uses_managed_identity = true
  storage_account_name          = azurerm_storage_account.storage_account_functions.name

  identity {
    type = "SystemAssigned"
  }

  app_settings = {
    "LLM_ANALYZER_SERVICEBUS_QUEUE_NAME_INPUT"                                 = azurerm_servicebus_queue.sb_queue_images.name
    "LLM_ANALYZER_SERVICEBUS_CONNECTION_STRING_INPUT__fullyQualifiedNamespace" = "${azurerm_servicebus_namespace.sb_namespace.name}.servicebus.windows.net"
    "LLM_ANALYZER_COSMOSDB_ENDPOINT"                                           = azurerm_cosmosdb_account.cosmosdb_account.endpoint
    "LLM_ANALYZER_COSMOSDB_DATABASE_NAME"                                      = azurerm_cosmosdb_sql_database.database.name
    "LLM_ANALYZER_COSMOSDB_CONTAINER_NAME"                                     = azurerm_cosmosdb_sql_container.places_container.name
    "LLM_ANALYZER_STORAGE_ENDPOINT"                                            = azurerm_storage_account.storage_account_functions.primary_blob_endpoint
    "LLM_ANALYZER_STORAGE_ACCOUNT_NAME"                                        = azurerm_storage_account.storage_account_functions.name
    "LLM_ANALYZER_STORAGE_CONTAINER_NAME"                                      = azurerm_storage_container.sc_classified_images.name
    "LLM_ANALYZER_FOUNDRY_ENDPOINT"                                            = "https://${azurerm_cognitive_account.account_llm.custom_subdomain_name}.cognitiveservices.azure.com/"
    "LLM_ANALYZER_FOUNDRY_DEPLOYMENT_NAME"                                     = azurerm_cognitive_deployment.deployment_llm.name
  }

  lifecycle {
    ignore_changes = [
      tags,
      app_settings["WEBSITE_RUN_FROM_PACKAGE"],
      app_settings["WEBSITE_ENABLE_SYNC_UPDATE_SITE"],
      site_config[0].application_stack
    ]
  }
}

resource "azurerm_role_assignment" "function_app_role_assignment_llm_analyzer" {
  scope                = azurerm_storage_account.storage_account_functions.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_linux_function_app.llm-analyzer-function.identity[0].principal_id
}

/**
 * Shops Function App
 */

resource "azurerm_linux_function_app" "shops-function" {
  name                                     = "${var.prefix}-shops-func"
  location                                 = azurerm_resource_group.rg.location
  resource_group_name                      = azurerm_resource_group.rg.name
  service_plan_id                          = azurerm_service_plan.service_plan.id
  ftp_publish_basic_authentication_enabled = false
  public_network_access_enabled            = true

  site_config {
    application_stack {
      node_version = "22"
    }
    application_insights_connection_string = azurerm_application_insights.application_insights_shops.connection_string

    cors {
      allowed_origins = ["*"]
    }
  }

  storage_uses_managed_identity = true
  storage_account_name          = azurerm_storage_account.storage_account_functions.name

  identity {
    type = "SystemAssigned"
  }

  app_settings = {
    "SHOP_COSMOSDB_ENDPOINT"      = azurerm_cosmosdb_account.cosmosdb_account.endpoint
    "SHOP_COSMOSDB_DATABASE_NAME" = azurerm_cosmosdb_sql_database.database.name
    "COSMOSDB_CONTAINER_ID"       = azurerm_cosmosdb_sql_container.places_container.name
  }

  lifecycle {
    ignore_changes = [
      tags,
      app_settings["WEBSITE_RUN_FROM_PACKAGE"],
      app_settings["WEBSITE_ENABLE_SYNC_UPDATE_SITE"],
      site_config[0].application_stack
    ]
  }
}

resource "azurerm_app_service_custom_hostname_binding" "shops_function_hostname" {
  hostname            = "api.doenerguide-stuttgart.de"
  app_service_name    = azurerm_linux_function_app.shops-function.name
  resource_group_name = azurerm_resource_group.rg.name

  lifecycle {
    ignore_changes = [ssl_state, thumbprint]
  }

  depends_on = [cloudflare_dns_record.api_verification]
}

resource "azurerm_app_service_managed_certificate" "shops_function_certificate" {
  custom_hostname_binding_id = azurerm_app_service_custom_hostname_binding.shops_function_hostname.id
}

resource "azurerm_app_service_certificate_binding" "shops_function_certificate_binding" {
  hostname_binding_id = azurerm_app_service_custom_hostname_binding.shops_function_hostname.id
  certificate_id      = azurerm_app_service_managed_certificate.shops_function_certificate.id
  ssl_state           = "SniEnabled"
}

resource "azurerm_role_assignment" "function_app_role_assignment_shops" {
  scope                = azurerm_storage_account.storage_account_functions.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_linux_function_app.shops-function.identity[0].principal_id
}

resource "azurerm_cosmosdb_sql_role_assignment" "shops_cosmos_role" {
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmosdb_account.name
  role_definition_id  = "${azurerm_cosmosdb_account.cosmosdb_account.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = azurerm_linux_function_app.shops-function.identity[0].principal_id
  scope               = azurerm_cosmosdb_account.cosmosdb_account.id
}

/**
 * Image Generator Function App
 */

resource "azurerm_linux_function_app" "image-generator-function" {
  name                                     = "${var.prefix}-image-generator-func"
  location                                 = azurerm_resource_group.rg.location
  resource_group_name                      = azurerm_resource_group.rg.name
  service_plan_id                          = azurerm_service_plan.service_plan.id
  ftp_publish_basic_authentication_enabled = false
  public_network_access_enabled            = true

  site_config {
    application_stack {
      node_version = "22"
    }
    application_insights_connection_string = azurerm_application_insights.application_insights_image_generator.connection_string

    cors {
      allowed_origins = ["*"]
    }
  }

  storage_uses_managed_identity = true
  storage_account_name          = azurerm_storage_account.storage_account_functions.name

  identity {
    type = "SystemAssigned"
  }

  app_settings = {
    "IMAGE_GENERATOR_SERVICEBUS_CONNECTION_STRING_INPUT" = azurerm_servicebus_namespace.sb_namespace.default_primary_connection_string
    "IMAGE_GENERATOR_COSMOSDB_ENDPOINT"                  = azurerm_cosmosdb_account.cosmosdb_account.endpoint
    "IMAGE_GENERATOR_COSMOSDB_DATABASE_NAME"             = azurerm_cosmosdb_sql_database.database.name
    "IMAGE_GENERATOR_COSMOSDB_CONTAINER_NAME"            = azurerm_cosmosdb_sql_container.places_container.name
    "IMAGE_GENERATOR_STORAGE_ACCOUNT_NAME"               = azurerm_storage_account.storage_account_functions.name
    "IMAGE_GENERATOR_STORAGE_CONTAINER_NAME"             = azurerm_storage_container.sc_generated_images.name
    "IMAGE_GENERATOR_GEMINI_API_KEY"                     = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault.kv.vault_uri}/secrets/google-gemini-api-key)"
  }

  lifecycle {
    ignore_changes = [
      tags,
      app_settings["WEBSITE_RUN_FROM_PACKAGE"],
      app_settings["WEBSITE_ENABLE_SYNC_UPDATE_SITE"],
      site_config[0].application_stack
    ]
  }
}

resource "azurerm_role_assignment" "image_generator_sb_role" {
  scope                = azurerm_servicebus_namespace.sb_namespace.id
  role_definition_name = "Azure Service Bus Data Owner"
  principal_id         = azurerm_linux_function_app.image-generator-function.identity[0].principal_id
}

resource "azurerm_role_assignment" "image_generator_key_vault_role" {
  scope                = azurerm_key_vault.kv.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_linux_function_app.image-generator-function.identity[0].principal_id
}

resource "azurerm_cosmosdb_sql_role_assignment" "image_generator_cosmos_role" {
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmosdb_account.name
  role_definition_id  = "${azurerm_cosmosdb_account.cosmosdb_account.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = azurerm_linux_function_app.image-generator-function.identity[0].principal_id
  scope               = azurerm_cosmosdb_account.cosmosdb_account.id
}

resource "azurerm_role_assignment" "image_generator_storage_role" {
  scope                = azurerm_storage_account.storage_account_functions.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_linux_function_app.image-generator-function.identity[0].principal_id
}


# --- Service Bus Role Assignments ---

resource "azurerm_role_assignment" "place_search_sb_role" {
  scope                = azurerm_servicebus_namespace.sb_namespace.id
  role_definition_name = "Azure Service Bus Data Owner"
  principal_id         = azurerm_linux_function_app.place-search-function.identity[0].principal_id
}

resource "azurerm_role_assignment" "image_classifier_sb_role" {
  scope                = azurerm_servicebus_namespace.sb_namespace.id
  role_definition_name = "Azure Service Bus Data Owner"
  principal_id         = azurerm_linux_function_app.image-classifier-function.identity[0].principal_id
}

resource "azurerm_role_assignment" "llm_analyzer_sb_role" {
  scope                = azurerm_servicebus_namespace.sb_namespace.id
  role_definition_name = "Azure Service Bus Data Owner"
  principal_id         = azurerm_linux_function_app.llm-analyzer-function.identity[0].principal_id
}

resource "azurerm_role_assignment" "llm_analyzer_openai_role" {
  scope                = azurerm_cognitive_account.account_llm.id
  role_definition_name = "Cognitive Services OpenAI User"
  principal_id         = azurerm_linux_function_app.llm-analyzer-function.identity[0].principal_id
}


# --- Cosmos DB Role Assignments ---

resource "azurerm_cosmosdb_sql_role_assignment" "place_search_cosmos_role" {
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmosdb_account.name
  role_definition_id  = "${azurerm_cosmosdb_account.cosmosdb_account.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = azurerm_linux_function_app.place-search-function.identity[0].principal_id
  scope               = azurerm_cosmosdb_account.cosmosdb_account.id
}

resource "azurerm_cosmosdb_sql_role_assignment" "image_classifier_cosmos_role" {
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmosdb_account.name
  role_definition_id  = "${azurerm_cosmosdb_account.cosmosdb_account.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = azurerm_linux_function_app.image-classifier-function.identity[0].principal_id
  scope               = azurerm_cosmosdb_account.cosmosdb_account.id
}

resource "azurerm_cosmosdb_sql_role_assignment" "llm_analyzer_cosmos_role" {
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmosdb_account.name
  role_definition_id  = "${azurerm_cosmosdb_account.cosmosdb_account.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = azurerm_linux_function_app.llm-analyzer-function.identity[0].principal_id
  scope               = azurerm_cosmosdb_account.cosmosdb_account.id
}
