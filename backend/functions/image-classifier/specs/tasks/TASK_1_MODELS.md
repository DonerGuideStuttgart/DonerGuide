# Task 1: Data Model Refactoring

## Ziel
Anpassung der zentralen Typen für die flache Bildstruktur und zusätzliche Metadaten.

## Details
- [ ] Modifiziere `@backend/functions/shared/doner_types/src/Photo.ts`:
  - `url`: Bleibt die Original-URL (Google).
  - Füge `mimeType`, `category` ('food'|'place'|'uncategorized') und `confidence` (number) hinzu.
  - Entferne `photoUrl` falls vorhanden und nutze einheitlich `url`.
- [ ] Modifiziere `@backend/functions/shared/doner_types/src/Place.ts`:
  - Ändere `photos` von einem verschachtelten Objekt zu einem flachen Array `Photo[]`.
- [ ] **Wichtig:** Da dies ein Shared Package ist, muss `npm run build` im `shared/doner_types` Ordner ausgeführt werden.
- [ ] Passe `place-search` an:
  - Muss neue Fotos direkt in das `photos` Array pushen.
  - Initialwerte: `category: 'uncategorized'`, `confidence: 0`, `mimeType: 'unknown'`.
