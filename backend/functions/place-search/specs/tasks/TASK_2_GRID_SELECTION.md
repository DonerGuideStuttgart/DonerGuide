# Task 2: Grid Initialization & Selection

## Ziel

Implementierung der Logik zum Erstellen des Start-Grids und der Auswahl der nächsten Zelle.

## Details

- [ ] Implementiere `initializeGrid()`: Erzeugt initiale Root-Zellen (ca. `TARGET_CELL_SIZE_KM` Seitenlänge, dynamisch berechnet via `KM_PER_DEGREE_LAT`) auf Level 0, wenn die `gridVersion` in der DB nicht mit der Config übereinstimmt.
- [ ] Implementiere `getNextCell()`:
  - Suche Zellen, die nicht `status: 'SPLIT'` sind.
  - Sortiere nach `lastProcessedAt ASC` (älteste/null zuerst).
  - Berücksichtige "stale" Zellen (`status: 'PROCESSING'` und `lastProcessedAt` > 30 Min alt).
- [ ] Schreibe Unit-Tests für die Grid-Generierung.
