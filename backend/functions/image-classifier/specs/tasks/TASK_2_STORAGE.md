# Task 2: Infrastructure & Blob Storage

## Ziel

Anbindung an Azure Blob Storage zum Speichern der heruntergeladenen Bilder.

## Details

- [ ] Installiere `@azure/storage-blob` im `image-classifier` Projekt.
- [ ] Implementiere einen `BlobService` oder Helper zum:
  - Download eines Bildes von einer URL (Google).
  - Upload als Buffer/Stream in den Container `photos`.
  - Dateiname = `photoId` (ohne Endung).
  - Setzen des richtigen `ContentType` Headers basierend auf dem Download-Response.
- [ ] Konfiguriere `local.settings.json` mit `IMAGE_CLASSIFIER_STORAGE_CONNECTION_STRING`.
