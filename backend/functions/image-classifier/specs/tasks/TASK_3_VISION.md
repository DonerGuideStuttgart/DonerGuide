# Task 3: Azure Vision Integration

## Ziel

Klassifizierung der Bilder in Food oder Place mittels Azure AI.

## Details

- [ ] Implementiere den Aufruf der **Computer Vision API v3.2** (Endpoint: `analyze`).
- [ ] Nutze den Parameter `visualFeatures=Categories`.
- [ ] Implementiere die Mapping-Logik:
  - `food_*` -> `food`
  - `building_*`, `indoor_*`, `outdoor_*` -> `place`
  - Sonst -> `uncategorized`
- [ ] Extrahiere den Confidence-Score der gewählten Kategorie.
- [ ] Erstelle Mock-Antworten für lokale Entwicklung ohne API-Key.
