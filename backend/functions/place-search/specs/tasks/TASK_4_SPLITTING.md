# Task 4: Binary Splitting Logic

## Ziel
Implementierung des "Divide"-Teils des Algorithmus.

## Details
- [ ] Implementiere `splitCell(cell: GridCell)`:
  - Ermittle die längste Seite der `boundaryBox` (Lat vs. Lon).
  - Berechne den Mittelpunkt und erstelle zwei neue `boundaryBox` Objekte.
  - Erzeuge zwei neue `GridCell` Dokumente mit `level = parent.level + 1`.
  - Setze die Parent-Zelle auf `status: 'SPLIT'`.
- [ ] Stelle sicher, dass der Split atomar (oder konsistent) in der CosmosDB erfolgt.
