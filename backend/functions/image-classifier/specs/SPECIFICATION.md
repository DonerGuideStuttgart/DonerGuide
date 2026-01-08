# Spezifikation: Image Classifier (v1.0)

## 1. Übersicht

Der `image-classifier` ist eine Azure Function, die Bild-URLs von Google Places verarbeitet. Er lädt die Bilder herunter, speichert sie in einem eigenen Azure Blob Storage, klassifiziert sie mittels Azure Computer Vision (v3.2) in Kategorien (Food vs. Place) und aktualisiert die Datenbank.

Das Ziel ist die Vorbereitung von Bildmaterial für den nachgelagerten `llm-analyzer`. Aus Urheberrechtsgründen werden diese Bilder **nicht** an das Frontend ausgespielt.

## 2. Systemarchitektur

- **Trigger:** Service Bus Queue `places` (Input Message: `NewPhotosMessage`).
- **Storage:** Azure Blob Storage (Container: `photos`).
- **AI:** Azure AI Vision (Computer Vision API v3.2 - Categorization).
- **DB:** CosmosDB (Container: `Places`).
- **Downstream:** Service Bus Queue `classified-images` (Triggert `llm-analyzer`).

## 3. Datenfluss & Logik

### A. Input (Service Bus)

Die Nachricht enthält die `storeId` und ein Array von `Photo` Objekten mit Google-URLs.

```typescript
interface NewPhotosMessage {
  id: string; // storeId
  photos: { id: string; url: string }[]; // url ist die Original-Google-URL
}
```

### B. Verarbeitung (Pro Bild)

1. **Download:** Das Bild wird von der `url` (Google) geladen.
2. **Storage:**
   - Speicherort: `{blob-container}/{photoId}` (ID ohne Dateiendung).
   - Die `id` dient als Referenz. Es wird **keine** neue Blob-URL in das `Photo`-Objekt geschrieben.
   - Metadaten: `ContentType` (Mime-Type) beim Upload setzen.
3. **Analyse (Azure Vision v3.2):**
   - Feature: `Categories`.
   - **Food Mapping:** Wenn Kategorie mit `food_` beginnt -> `category = 'food'`.
   - **Place Mapping:** Wenn Kategorie mit `building_`, `indoor_` oder `outdoor_` beginnt -> `category = 'place'`.
   - **Sonst:** `category = 'discard'`.
4. **Cleanup:** Bilder mit `category = 'discard'` werden aus dem Blob Storage gelöscht (falls temporär gespeichert) und nicht in die Datenbank übernommen.

### C. Datenbank Update

Das `Place` Dokument in der CosmosDB wird aktualisiert:

- Das Feld `photos` ist eine flache Liste (`Photo[]`).
- `place-search` initialisiert neue Fotos als `uncategorized`.
- `image-classifier` iteriert über die Fotos:
  - **Treffer (Food/Place):** Aktualisiere `mimeType`, `category`, `confidence`.
  - **Kein Treffer (Discard):** Entferne das Foto-Objekt aus dem `photos` Array.
- `url` bleibt die Original-URL (Google).

### D. Output (Service Bus)

Nach Abschluss aller Bilder eines Ladens wird eine Nachricht an die Queue `classified-images` gesendet:

```json
{ "storeId": "PLACE_UUID" }
```

## 4. Infrastruktur & Keys

- `IMAGE_CLASSIFIER_STORAGE_CONNECTION_STRING`
- `IMAGE_CLASSIFIER_VISION_ENDPOINT`
- `IMAGE_CLASSIFIER_VISION_KEY`
- `IMAGE_CLASSIFIER_COSMOSDB_CONNECTION_STRING`

## 5. Security & Privacy

- Bilder dienen nur der internen Analyse durch die KI.
- Kein öffentlicher Zugriff auf den Blob Container `photos`.
- Keine Weitergabe der URLs an das Frontend über die API.
