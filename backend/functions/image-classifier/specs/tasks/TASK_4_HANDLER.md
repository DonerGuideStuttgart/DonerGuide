# Task 4: Main Handler & Database Sync

## Ziel

Zusammenführung der Komponenten und Aktualisierung der CosmosDB.

## Details

- [ ] Implementiere den Service Bus Trigger Handler in `src/functions/imageClassifier.ts`.
- [ ] Implementiere die Verarbeitung der Bilder:
  - **Wichtig:** Nutze **`Promise.allSettled`**, um alle Bilder (max. 10) **parallel** herunterzuladen und zu analysieren.
  - Dies minimiert die Laufzeit der Azure Function.
- [ ] Implementiere den "Deep Merge" in CosmosDB:
  - Lade das `Place` Dokument.
  - Verarbeite die Ergebnisse der Bildanalyse:
    - **Valid (Food/Place):** Aktualisiere das entsprechende `Photo` Objekt im Array.
    - **Invalid:** Entferne das `Photo` Objekt aus dem Array und lösche ggf. den Blob.
  - Verhindere Duplikate.
  - Behalte das `ai_analysis` Feld unbedingt bei.
- [ ] Sende am Ende eine Nachricht an die Service Bus Queue `classified-images` mit der `storeId`.
