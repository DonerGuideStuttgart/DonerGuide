# Task 6: Photo & Blob Integration

## Ziel
Effizientes Handling von Bildern.

## Details
- [ ] Implementiere den parallelen Download von bis zu 10 Fotos pro Place.
- [ ] Implementiere die `BlobStorageService` Anbindung.
- [ ] Implementiere Deduplizierung: Prüfe vor dem Download, ob `PHOTO_REFERENCE.jpg` bereits im Blob Storage existiert.
- [ ] Speichere die resultierenden Blob-URLs im `Place` Objekt.
