# Task 3: Refactor Image Classifier (Consumer)

## Ziel
Implementierung der granularen Verarbeitung, Idempotenz-Prüfung und atomaren DB-Updates.

## Schritte

### A. Stored Procedure (`patchPhoto`)
1.  Erstelle eine Datei `src/db/sproc/patchPhoto.js` (oder ähnlich).
2.  Inhalt (Pseudo-Code JS für CosmosDB Server-Side):
    ```javascript
    function patchPhoto(storeId, photoId, analysisResult) {
        var collection = getContext().getCollection();
        var response = getContext().getResponse();

        // 1. Read Document
        collection.queryDocuments(
            collection.getSelfLink(),
            `SELECT * FROM c WHERE c.id = "${storeId}"`,
            function (err, docs) {
                if (err) throw err;
                if (!docs || docs.length === 0) throw new Error("Place not found");

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

                if (!updated) {
                    // Foto evtl. gelöscht oder nicht gefunden? -> Log/Ignore
                }

                // 3. Check completeness
                var pendingCount = 0;
                for (var j = 0; j < photos.length; j++) {
                    if (photos[j].category === 'uncategorized') pendingCount++;
                }

                place.photos = photos;

                // 4. Write back
                collection.replaceDocument(place._self, place, function (err, result) {
                    if (err) throw err;
                    response.setBody({ 
                        storeId: storeId, 
                        isComplete: (pendingCount === 0) 
                    });
                });
            }
        );
    }
    ```
3.  Implementiere einen Mechanismus (Script oder im Code beim Start), der sicherstellt, dass diese SP in der Collection existiert.

### B. Handler Refactoring (`imageClassifier.ts`)
1.  Passe den Trigger auf die neue Message-Struktur an.
2.  **Pre-Check (Idempotenz):** Lese den Place aus der DB. Prüfe `place.photos.find(p => p.id === photoId)`.
    - Wenn `category !== 'uncategorized'`, logge "Already done" und return (Message acknowledged).
3.  **Processing:**
    - Download Bild.
    - Vision API Analyse.
    - Upload Blob (falls nötig, oder ist es schon da?). *Anmerkung: Aktuell lädt der Classifier runter und speichert im Blob. Das bleibt so.*
4.  **Atomic Update:**
    - Rufe die Stored Procedure `patchPhoto` auf.
    - Parameter: `[storeId, photoId, { category, confidence, mimeType }]`.
5.  **Downstream Trigger:**
    - Wenn SP-Result `isComplete === true` zurückgibt:
    - Sende Nachricht an Queue `classified-images` (`{ storeId }`).

### C. Configuration
1.  Setze in `host.json`:
    ```json
    "extensions": {
      "serviceBus": {
        "messageHandlerOptions": {
          "maxConcurrentCalls": 5
        }
      }
    }
    ```
    Dies limitiert die parallelen Executions (und damit Vision API Calls) auf 5 pro Instanz.

## Akzeptanzkriterien
- [ ] Handler verarbeitet Einzel-Nachrichten erfolgreich.
- [ ] DB Updates erfolgen atomar via Stored Procedure.
- [ ] `classified-images` Nachricht wird nur gesendet, wenn der Laden komplett fertig ist.
- [ ] Doppelte Nachrichten führen nicht zu doppelten API-Kosten (Idempotenz).
