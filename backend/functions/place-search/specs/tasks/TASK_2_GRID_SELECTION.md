# Task 2: Grid Initialization & Selection

## Ziel
Implementierung der Logik zum Erstellen des Start-Grids und der Auswahl der nächsten Zelle.

## Details
- [ ] Implementiere `initializeGrid()`: Erzeugt 16 initiale Root-Zellen (4x4 Grid) auf Level 0, wenn die `gridVersion` in der DB nicht mit der Config übereinstimmt.
- [ ] Implementiere `getNextCell()`:
  - Suche Zellen, die nicht `status: 'SPLIT'` sind.
  - Sortiere nach `lastProcessedAt ASC` (älteste/null zuerst).
  - Berücksichtige "stale" Zellen (`status: 'PROCESSING'` und `lastProcessedAt` > 30 Min alt).
- [ ] Schreibe Unit-Tests für die Grid-Generierung.
