# Task 2: Refactor Crawler (Producer)

## Ziel
Umstellung des `place-search` Service auf das Senden von Einzel-Nachrichten und Implementierung von Optimistic Concurrency Control.

## Schritte

### A. Messaging Refactoring (`placeSearch.ts`)
1.  Ändere die Logik beim Senden an den Service Bus.
2.  Anstatt ein Array von Photos zu senden, iteriere über die **neuen** Fotos (die gerade erst dem Place hinzugefügt wurden).
3.  Sende für jedes Foto mit `category === 'uncategorized'` eine eigene `PhotoClassificationMessage`.
    - **Hinweis:** Nutze `Promise.all` für das Senden an den Service Bus, um die Laufzeit nicht unnötig zu verlängern, aber achte auf Batching limits (Azure SDK macht das meist automatisch gut, aber bei >100 Nachrichten ggf. aufteilen).

### B. Optimistic Concurrency Control (`createOrUpdateItem`)
1.  Modifiziere die `createOrUpdateItem` Funktion.
2.  Lese das bestehende Item inkl. `_etag`.
3.  Implementiere eine Retry-Loop (z.B. max 3 Versuche):
    - Versuche `container.item(...).replace(newItem, { accessCondition: { type: "IfMatch", condition: existingEtag } })`.
    - Catch Error:
      - Wenn `412 (Precondition Failed)`:
        - Lese das Dokument **neu** aus der DB.
        - Führe den Merge deiner Änderungen (Google Daten update, neue Fotos anfügen) erneut auf dem **neuen** Dokument aus.
        - Wiederhole den Upsert.
      - Wenn anderer Fehler: Throw.
4.  Dies verhindert, dass der Crawler Updates vom `image-classifier` überschreibt, die in der Millisekunde zwischen Read und Write passiert sind.

## Akzeptanzkriterien
- [ ] Crawler sendet `PhotoClassificationMessage` pro Bild.
- [ ] Crawler überschreibt keine parallelen Änderungen am Place-Dokument (Testbar durch simuliertes Race Condition).
- [ ] Alte `NewPhotosMessage` Logik ist entfernt.
