# Spezifikation: Place Search Crawler (v1.0)

## 1. Übersicht
Automatisierter Azure-Service zur flächendeckenden Erfassung und Aktualisierung von Dönerläden in Stuttgart. Das System optimiert seine Suchabfragen selbstständig durch ein dynamisches, binäres Spatial-Grid (Quadtree-Variante mit Binary Split).

## 2. Systemarchitektur
- **Runtime:** Azure Function (Node.js, Timer Trigger @ 15 Min).
- **Datenbank:** CosmosDB (Container: `GridCells` mit Spatial Index, `Places`).
- **Storage:** Azure Blob Storage (Container: `photos`).
- **API:** Google Places API (New) - `searchText`.
- **Downstream:** Service Bus Queue `places` (Triggert Image-Classification).

## 3. Datenmodelle

### GridCell (CosmosDB)
```typescript
interface GridCell {
  id: string;             // UUID
  gridVersion: string;    // z.B. "2026-01-02-stuttgart"
  level: number;          // Splitting-Tiefe
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'SPLIT';
  geometry: {             // GeoJSON Polygon für Spatial Queries
    type: "Polygon";
    coordinates: number[][][];
  };
  boundaryBox: { 
    minLat: number; 
    minLon: number; 
    maxLat: number; 
    maxLon: number; 
  };
  resultsCount: number;
  foundPlaceIds: string[];
  lastProcessedAt: string;
}
```

## 4. Konfiguration & Konstanten
- `MAX_LEVEL`: 10 (Verhindert unendliches Splitten bei extremer Punktdichte).
- `INITIAL_GRID_SIZE`: 4x4 (16 Root-Zellen auf Level 0).

## 5. Kernalgorithmen

### A. Auswahl-Logik (Zyklische Priorisierung)
1. **Grid-Check:** Finde Zellen mit `gridVersion` != `CURRENT_VERSION`. Falls keine vorhanden oder Version veraltet: Initialisiere neues Grid (16 Root-Zellen auf Level 0) basierend auf den konfigurierten Boundaries.
2. **Task-Auswahl:** Suche nächste zu bearbeitende Zelle (`status != 'SPLIT'`):
   - **Filter:** `status != 'SPLIT'` (Bearbeite `PENDING`, `COMPLETED` und "stale" `PROCESSING` Zellen).
   - **Sortierung:** `lastProcessedAt ASC` (Älteste oder nie bearbeitete Zellen zuerst). Dies sorgt für eine endlose zyklische Aktualisierung aller Blätter des Grids.
   - **Stale-Reset:** Falls `status == 'PROCESSING'` und `lastProcessedAt < Now - 30min`, wird die Zelle erneut ausgewählt.

### B. Such- & Split-Logik (Divide & Conquer)
1. **API-Call:** Google Places Text Search (New) mit `locationRestriction` (Rectangle) auf die `boundaryBox`.
   - **Pagination:** Es werden bis zu 3 Seiten geladen (via `nextPageToken`), um die tatsächliche Anzahl der Läden (bis max. 60) zu ermitteln.
2. **Ergebnis-Auswertung:**
   - **Fall > 60 Ergebnisse:** Das API-Limit ist erreicht.
     - Falls `level < MAX_LEVEL`: Zelle auf `SPLIT` setzen.
       - **Binary Split:** Teile die Zelle an ihrer längsten Seite (Breitengrad vs. Längengrad).
       - Erzeuge zwei neue `GridCell` Dokumente (`level + 1`, Status `PENDING`).
     - Falls `level >= MAX_LEVEL`: Markiere Zelle als `COMPLETED` mit Hinweis auf `OVERFLOW` (loggen). Verarbeite die 60 Ergebnisse.
   - **Fall <= 60 Ergebnisse:** Zelle ist ausreichend klein.
     - Verarbeite alle gefundenen `Places`.
     - Setze Status auf `COMPLETED` und aktualisiere `lastProcessedAt` sowie `resultsCount`.

### C. Merging-Logik (verschoben auf v2)
*Die Merging-Logik zur Reduzierung von Zellen wurde für das MVP entfernt, um die Systemkomplexität zu verringern.*

### D. Photo-Handling & Daten-Merge
- **Referenz-Modus:** Die Crawler-Function lädt **keine Bilder**. Sie extrahiert nur die `photo_reference` und Metadaten von bis zu 10 Fotos pro Place.
- **Service Bus:** Alle neuen/aktualisierten Places werden an die Service Bus Queue `places` gesendet. Die Function `image-classifier` übernimmt den Download und die Analyse.
- **Update-Logik (Upsert):** 
  - Google Daten (Name, Adresse, Öffnungszeiten, Payments) überschreiben bestehende Werte.
  - Vorhandene `ai_analysis` Felder bleiben erhalten (Deep Merge).
  - Neue Photo-Referenzen werden an das bestehende Array angehängt.
  - **Service Bus Sync:** Eine Nachricht an `places` wird nur gesendet, wenn ein neuer Laden gefunden wurde oder sich das `last_updated` Feld von Google seit dem letzten Scan geändert hat.

### E. Payment Mapping
Mapping des `paymentOptions` Objekts der Google API auf `doner_types`:
- `acceptsCashOnly: true` -> `PaymentMethods.CASH`
- `acceptsCreditCards: true` -> `PaymentMethods.CREDIT_CARD`
- `acceptsDebitCards: true` -> `PaymentMethods.DEBIT_CARD`
- `acceptsNfc: true` -> `PaymentMethods.NFC`

## 6. Konfiguration (Umgebungsvariablen)
- `PLACE_SEARCH_DRY_RUN`: `true/false` (Simuliert API).
- `PLACE_SEARCH_GRID_VERSION`: Aktuelle Version (z.B. "1").
- `GOOGLE_PLACES_API_KEY`: API Key (aus Key Vault).
- `PLACE_SEARCH_STUTTGART_MIN_LAT/LON`, `MAX_LAT/LON`: Stadtgrenzen.

## 7. Monitoring & Fehlerbehandlung
- **API Quota (429):** Sofortiger Abbruch der Function.
- **Logging:** Erfassung von "Neu gefundenen Läden", "Aktualisierten Läden" und "Splits/Merges" pro Durchlauf.
- **Zombie-Reset:** Zellen, die länger als 30 Min auf `PROCESSING` stehen, werden automatisch wieder auf `PENDING` gesetzt.
