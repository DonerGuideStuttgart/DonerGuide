# Task 1: Shared Types & Contracts

## Ziel

Definition der neuen Nachrichten-Struktur für die entkoppelte Foto-Verarbeitung.

## Schritte

1.  **Modify `doner_types/src/messages.ts`** (oder wo `NewPhotosMessage` definiert ist):
    - Erstelle ein neues Interface `PhotoClassificationMessage`:
      ```typescript
      export interface PhotoClassificationMessage {
        storeId: string;
        photoId: string;
        url: string; // Google Original URL
      }
      ```
    - Markiere das bestehende `NewPhotosMessage` als `@deprecated` (oder entferne es, wenn wir einen Hard-Cut machen).

2.  **Build Shared Package**
    - Führe `npm run build` in `@backend/functions/shared/doner_types` aus, damit die Änderungen für die Functions verfügbar sind.

## Akzeptanzkriterien

- [ ] `PhotoClassificationMessage` ist exportiert.
- [ ] Package kompiliert fehlerfrei.
