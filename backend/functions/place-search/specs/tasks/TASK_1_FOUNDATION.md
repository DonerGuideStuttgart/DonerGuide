# Task 1: Foundation & Models

## Ziel

Definition der Datenstrukturen und Vorbereitung der Infrastruktur-Anbindung.

## Details

- [ ] Erstelle das `GridCell` Interface in `src/types/grid.ts`.
- [ ] Stelle sicher, dass `doner_types` korrekt eingebunden ist.
- [ ] Erweitere `local.settings.json` um die benötigten Variablen:
  - `PLACE_SEARCH_GRID_VERSION`
  - `PLACE_SEARCH_STUTTGART_MIN_LAT/LON` etc.
  - `GOOGLE_PLACES_API_KEY`
- [ ] Initialisiere die CosmosDB Clients für die Container `GridCells` und `Places`.
- [ ] Konfiguriere den Spatial Index für den `GridCells` Container (GeoJSON `geometry` Feld).
