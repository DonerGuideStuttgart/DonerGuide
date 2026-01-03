# Task 8: Orchestration & Resilience

## Ziel
Zusammenführung aller Komponenten und Robustheit.

## Details
- [ ] Finalisiere den Main-Handler in `placeSearch.ts`.
- [ ] Implementiere den `PLACE_SEARCH_DRY_RUN` Modus (Mock API calls).
- [ ] Implementiere Error-Handling für Google Quota (429) und Netzwerkfehler.
- [ ] Füge detailliertes Logging hinzu (Anzahl neue Läden, Anzahl Splits, Merges).
- [ ] Implementiere den "Zombie-Reset" (stale PROCESSING Zellen).
