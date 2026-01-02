# Task 2: Grid Initialization & Selection

## Ziel
Implementierung der Logik zum Erstellen des Start-Grids und der Auswahl der nächsten Zelle.

## Details
- [ ] Implementiere `initializeGrid()`: Erzeugt ein initiales 4x4 Grid, wenn die `gridVersion` in der DB nicht mit der Config übereinstimmt.
- [ ] Implementiere `getNextCell()`:
  - Suche Zellen mit `status: 'PENDING'`.
  - Berücksichtige "stale" Zellen (`status: 'PROCESSING'` und `lastProcessedAt` > 30 Min alt).
  - Sortiere nach `level DESC` (Priorität auf dichte Gebiete) und `lastProcessedAt ASC`.
- [ ] Schreibe Unit-Tests für die Grid-Generierung.
