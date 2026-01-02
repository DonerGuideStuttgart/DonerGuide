# Task 7: Place Sync & Service Bus

## Ziel
Datenpersistenz und Triggerung der KI-Pipeline.

## Details
- [ ] Implementiere die "Deep Merge" Logik für `Places`:
  - Neue Google Daten überschreiben alte Stammdaten.
  - `ai_analysis` Feld muss erhalten bleiben.
  - Photo-Arrays werden gemerged (Deduplizierung).
- [ ] Implementiere den Service Bus Publisher für die Queue `places`.
- [ ] **Optimierung:** Sende nur eine Nachricht, wenn der Laden neu ist oder sich die Daten (`last_updated` von Google) geändert haben.
