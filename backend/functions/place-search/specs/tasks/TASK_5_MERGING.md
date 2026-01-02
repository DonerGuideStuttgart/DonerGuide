# Task 5: Spatial Merging Logic

## Ziel
Implementierung des "Conquer"-Teils (Kostenoptimierung).

## Details
- [ ] Implementiere die Nachbarschaftssuche via `ST_INTERSECTS` in CosmosDB.
- [ ] Implementiere den "Perfect Rectangle" Test:
  - Prüfe, ob die kombinierte Fläche von Zelle A und B exakt der Fläche der neuen Boundary Box entspricht.
- [ ] Implementiere die Merge-Logik:
  - Lösche A und B.
  - Erstelle C mit kombinierten `foundPlaceIds` und Status `COMPLETED`.
  - Schwellenwert: `Sum(resultsCount) < 40`.
