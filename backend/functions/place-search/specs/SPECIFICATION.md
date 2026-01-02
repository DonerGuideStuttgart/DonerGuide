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

## 4. Kernalgorithmen

### A. Auswahl-Logik (Priorisierung)
1. **Grid-Check:** Finde Zellen mit `gridVersion` != `CURRENT_VERSION`. Falls keine vorhanden oder Version veraltet: Initialisiere neues Grid (4x4) basierend auf den konfigurierten Boundaries.
2. **Task-Auswahl:** Suche nächste zu bearbeitende Zelle:
   - **Filter:** `status == 'PENDING' OR (status == 'PROCESSING' AND lastProcessedAt < Now - 30min)` (Self-Healing für abgestürzte Instanzen).
   - **Sortierung:** `level DESC` (Dichte Gebiete/kleine Zellen zuerst), danach `lastProcessedAt ASC` (älteste zuerst).

### B. Such- & Split-Logik (Divide & Conquer)
1. **API-Call:** Google Places Text Search (New) mit `locationRestriction` (Rectangle) auf die `boundaryBox`.
2. **Ergebnis-Auswertung:**
   - **Fall > 60 Ergebnisse:** Das API-Limit ist erreicht. Zelle auf `SPLIT` setzen.
     - **Binary Split:** Teile die Zelle an ihrer längsten Seite (Breitengrad vs. Längengrad).
     - Erzeuge zwei neue `GridCell` Dokumente (`level + 1`, Status `PENDING`).
   - **Fall <= 60 Ergebnisse:** Zelle ist ausreichend klein.
     - Verarbeite alle gefundenen `Places`.
     - Setze Status auf `COMPLETED` und aktualisiere `lastProcessedAt` sowie `resultsCount`.

### C. Merging-Logik (Kostenoptimierung)
- **Trigger:** Nach jedem erfolgreichen `COMPLETED` Scan.
- **Prozess:** Suche räumliche Nachbarn via `ST_INTERSECTS`.
- **Bedingungen für Merge von Zelle A und B:**
  1. Beide sind `COMPLETED`.
  2. `A.resultsCount + B.resultsCount < 40` (Sicherheitspuffer zum 60er Limit).
  3. Die Verschmelzung ergibt wieder ein exaktes Rechteck (Flächentest).
- **Aktion:** Lösche A und B, erstelle neue kombinierte Zelle (Status `COMPLETED`).

### D. Photo-Handling & Daten-Merge
- **Download:** Pro Place werden alle von Google gelieferten Fotos (max. 10) geladen.
- **Storage:** Speicherung als `PHOTO_REFERENCE.jpg` (unstrukturiert) im Blob Storage.
- **Deduplizierung:** Existiert der Blob-Name bereits, wird der Download übersprungen.
- **Update-Logik (Upsert):** 
  - Google Daten (Name, Adresse, Öffnungszeiten, Payments) überschreiben bestehende Werte.
  - Vorhandene `ai_analysis` Felder bleiben erhalten (Deep Merge).
  - Neue Photo-Referenzen werden an das bestehende Array angehängt.

### E. Payment Mapping
Mapping der Google API Booleans auf `doner_types`:
- `acceptsCashOnly: true` -> `PaymentMethods.CASH`
- `acceptsCreditCards: true` -> `PaymentMethods.CREDIT_CARD`
- `acceptsDebitCards: true` -> `PaymentMethods.DEBIT_CARD`
- `acceptsNfc: true` -> `PaymentMethods.NFC`

## 5. Konfiguration (Umgebungsvariablen)
- `PLACE_SEARCH_DRY_RUN`: `true/false` (Simuliert API & DB Writes).
- `PLACE_SEARCH_GRID_VERSION`: Aktuelle Version (z.B. "v1").
- `GOOGLE_PLACES_API_KEY`: API Key (aus Key Vault).
- `PLACE_SEARCH_STUTTGART_MIN_LAT/LON`, `MAX_LAT/LON`: Stadtgrenzen.

## 6. Monitoring & Fehlerbehandlung
- **API Quota (429):** Sofortiger Abbruch der Function.
- **Logging:** Erfassung von "Neu gefundenen Läden", "Aktualisierten Läden" und "Splits/Merges" pro Durchlauf.
- **Zombie-Reset:** Zellen, die länger als 30 Min auf `PROCESSING` stehen, werden automatisch wieder auf `PENDING` gesetzt.
