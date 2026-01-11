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
function patchPhoto(storeId, photoId, analysisResult) {
    var collection = getContext().getCollection();
    var response = getContext().getResponse();

    // 1. Read Document
    var query = {
        query: "SELECT * FROM c WHERE c.id = @id",
        parameters: [{ name: "@id", value: storeId }]
    };

    var isAccepted = collection.queryDocuments(
        collection.getSelfLink(),
        query,
        function (err, docs) {
            if (err) throw err;
            if (!docs || docs.length === 0) throw new Error("Place not found: " + storeId);

            var place = docs[0];
            var photos = place.photos || [];
            var updated = false;

            // 2. Find and Update Photo
            for (var i = 0; i < photos.length; i++) {
                if (photos[i].id === photoId) {
                    photos[i].category = analysisResult.category;
                    photos[i].confidence = analysisResult.confidence;
                    photos[i].mimeType = analysisResult.mimeType;
                    updated = true;
                    break;
                }
            }

            // 3. Check completeness (are there any 'uncategorized' photos left?)
            var pendingCount = 0;
            for (var j = 0; j < photos.length; j++) {
                if (photos[j].category === 'uncategorized') {
                    pendingCount++;
                }
            }

            place.photos = photos;
            place.lastUpdated = new Date().toISOString();

            // 4. Write back
            var isAcceptedWrite = collection.replaceDocument(place._self, place, function (err, result) {
                if (err) throw err;
                response.setBody({
                    storeId: storeId,
                    isComplete: (pendingCount === 0)
                });
            });

            if (!isAcceptedWrite) throw new Error("The query was not accepted by the server (write).");
        }
    );

    if (!isAccepted) throw new Error("The query was not accepted by the server (read).");
}
