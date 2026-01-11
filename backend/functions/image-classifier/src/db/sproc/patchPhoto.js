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
export function patchPhoto(storeId, photoId, analysisResult) {
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
    // 2. Find and Update Photo
    for (const photo of photos) {
      if (photo.id === photoId) {
        photo.category = analysisResult.category;
        photo.confidence = analysisResult.confidence;
        photo.mimeType = analysisResult.mimeType;
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
