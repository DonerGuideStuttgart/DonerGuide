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

resource "azurerm_cosmosdb_sql_stored_procedure" "patch_photo" {
  name                = "patchPhoto"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmosdb_account.name
  database_name       = azurerm_cosmosdb_sql_database.database.name
  container_name      = azurerm_cosmosdb_sql_container.places_container.name

  body = <<BODY
/**
 * CosmosDB Stored Procedure: patchPhoto
 *
 * Atomically updates a single photo's classification result within a Place document.
 * Returns { storeId, isComplete: boolean }
 *
 * @param {string} storeId
 * @param {string} photoId
 * @param {object} analysisResult { category, confidence, mimeType }
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function patchPhoto(storeId, photoId, analysisResult) {
  // eslint-disable-next-line no-undef
  var collection = getContext().getCollection();
  // eslint-disable-next-line no-undef
  var response = getContext().getResponse();

  // 1. Read Document
  var query = {
    query: "SELECT * FROM c WHERE c.id = @id",
    parameters: [{ name: "@id", value: storeId }],
  };

  var isAccepted = collection.queryDocuments(collection.getSelfLink(), query, function (err, docs) {
    if (err) throw err;
    if (!docs || docs.length === 0) throw new Error("Place not found: " + storeId);

    var place = docs[0];
    var photos = place.photos || [];
    // 2. Find and Update Photo (using traditional loop for splice-safety if needed, but linter wants for-of)
    // Actually, linter wants for-of. Since we break after splice, it's safe.
    for (var i = 0; i < photos.length; i++) {
      if (photos[i].id === photoId) {
        if (analysisResult.category === "discard") {
          photos.splice(i, 1);
        } else {
          photos[i].category = analysisResult.category;
          photos[i].confidence = analysisResult.confidence;
          photos[i].mimeType = analysisResult.mimeType;
        }
        break;
      }
    }

    // 3. Check completeness (are there any 'uncategorized' photos left?)
    var pendingCount = 0;
    for (const photo of photos) {
      if (photo.category === "uncategorized") {
        pendingCount++;
      }
    }

    place.photos = photos;
    place.lastUpdated = new Date().toISOString();

    // 4. Write back
    var isAcceptedWrite = collection.replaceDocument(place._self, place, function (err) {
      if (err) throw err;
      response.setBody({
        storeId: storeId,
        isComplete: pendingCount === 0,
      });
    });

    if (!isAcceptedWrite) throw new Error("The query was not accepted by the server (write).");
  });

  if (!isAccepted) throw new Error("The query was not accepted by the server (read).");
}
BODY
}

