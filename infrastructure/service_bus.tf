resource "azurerm_servicebus_namespace" "sb_namespace" {
  name                = "${var.prefix}-sb-namespace"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "Basic"
}

resource "azurerm_servicebus_queue" "sb_queue_places" {
  name         = "places-queue"
  namespace_id = azurerm_servicebus_namespace.sb_namespace.id
}

resource "azurerm_servicebus_queue" "sb_queue_images" {
  name         = "images-queue"
  namespace_id = azurerm_servicebus_namespace.sb_namespace.id
}

resource "azurerm_servicebus_queue" "sb_queue_reviews" {
  name         = "reviews-queue"
  namespace_id = azurerm_servicebus_namespace.sb_namespace.id
}
