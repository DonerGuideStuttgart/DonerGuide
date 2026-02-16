# Place Search Function

Diese Azure Function ist der zentrale Crawler des DönerGuides. Sie erfasst systematisch Dönerläden in einem definierten Bereich über die Google Places API und hält die Daten in der CosmosDB aktuell.

## Funktion

- **Automatisches Crawling**: Die Funktion läuft zeitgesteuert (Timer Trigger, standardmäßig alle 15 Minuten).
- **Daten-Aggregation**: Suche nach Dönerläden mittels Google Places API (New).
- **Persistence**: Speicherung und Aktualisierung der Läden (`Places`) und des Such-Status (`GridCells`) in Azure CosmosDB.
- **Downstream Integration**: Benachrichtigung des `image-classifier` via Service Bus Queue (`places`), wenn neue Fotos oder Datenänderungen vorliegen.

## Algorithmus: Dynamic Binary Spatial Grid

Um das Limit der Google API (max. 60 Ergebnisse pro Suche) zu umgehen und eine flächendeckende Erfassung zu garantieren, nutzt der Crawler ein dynamisches Grid-System:

1. **Initialisierung**: Das Zielgebiet wird in ein Start-Grid unterteilt, dessen Zellen ca. `TARGET_CELL_SIZE_KM` (5 km) Seitenlänge haben. Die Zellenanzahl ergibt sich dynamisch aus geodätischen Berechnungen (`KM_PER_DEGREE_LAT`).
2. **Zyklische Verarbeitung**: Pro Durchlauf wird die Zelle ausgewählt, die am längsten nicht mehr bearbeitet wurde (`lastProcessedAt` ASC).
3. **Suche & Split (Divide & Conquer)**:
   - Die Funktion sucht in der `boundaryBox` der Zelle nach Läden.
   - **Fall > 60 Ergebnisse**: Die Zelle ist zu dicht besiedelt. Sie wird mittels **Binary Split** an der längsten Seite in zwei neue Zellen unterteilt (bis `MAX_LEVEL` 10).
   - **Fall <= 60 Ergebnisse**: Alle Läden wurden erfasst. Die Zelle wird als `COMPLETED` markiert.
4. **Deep Merge**:
   - Bestehende Läden werden aktualisiert (Upsert).
   - Manuelle Korrekturen oder `ai_analysis` Felder bleiben erhalten.
   - Neue Foto-Referenzen werden dedupliziert angehängt.

## Inputs

### Umgebungsvariablen (Environment Variables)

- `PLACE_SEARCH_GRID_VERSION`: Version des Grids (erzwingt Re-Initialisierung bei Änderung).
- `GOOGLE_PLACES_API_KEY`: API-Schlüssel für die Google Maps Platform.
- `PLACE_SEARCH_COSMOSDB_CONNECTION_STRING`: Verbindung zur CosmosDB.
- `PLACE_SEARCH_STUTTGART_MIN_LAT/LON` & `MAX_LAT/LON`: Geografische Grenzen des Suchgebiets.
- `PLACE_SEARCH_DRY_RUN`: Wenn `true`, werden API-Aufrufe simuliert (Mock-Modus).

### Datenquellen

- **Google Places API (New)**: `searchText` Endpoint mit `locationRestriction`.
- **CosmosDB**: Container `GridCells` (Grid-Status) und `Places` (Stammdaten).

## Outputs

- **Azure CosmosDB**:
  - Aktualisierte Geometrien und Status in `GridCells`.
  - Neue oder aktualisierte Dokumente in `Places`.
- **Azure Service Bus**:
  - Nachrichten in der Queue `places` mit Place-IDs und Foto-Referenzen für die nachgelagerte Bildverarbeitung.
- **Logging**:
  - Detaillierte Logs über gefundene Läden, durchgeführte Splits und API-Status.
