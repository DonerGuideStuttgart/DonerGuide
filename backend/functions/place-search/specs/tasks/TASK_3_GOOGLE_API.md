# Task 3: Google Places API & Mapping

## Ziel

Anbindung der Google Places API (New) und Mapping der Ergebnisse.

## Details

- [ ] Implementiere den `searchText` Call mit `locationRestriction`.
- [ ] **Pagination-Handling:** Implementiere die Logik, um mittels `nextPageToken` bis zu 3 Seiten (insg. max. 60 Ergebnisse) pro Zelle zu laden.
- [ ] Nutze FieldMasks, um Kosten zu sparen (id, name, address, location, openingHours, paymentOptions, etc.).
- [ ] Implementiere das Mapping von Google-Ergebnissen auf das `Place` Interface.
- [ ] Implementiere das `Payment Mapping` (Umwandlung des `paymentOptions` Objekts).
- [ ] Implementiere einen Mock-Modus für lokale Tests ohne API-Kosten.
