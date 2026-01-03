# AGENTS.md - Project Knowledge Base for AI Agents

## 1. Projektübersicht

- **Was macht das Projekt?**: DönerGuide Stuttgart ist eine KI-gestützte Plattform zur Analyse und Bewertung von Döner-Imbissen in Stuttgart.
- **Problemstellung**: Strukturierte, objektive und unterhaltsame Bewertung von Fleischqualität, Saucenmenge und Gesamtpaket mittels KI-Bildanalyse und LLMs.
- **Zielgruppe**: Döner-Liebhaber in Stuttgart und Besucher, die datengestützte Empfehlungen suchen.

## 2. Tech-Stack

- **Frontend**: Next.js 15 (React 19), Tailwind CSS 4, DaisyUI 5, HeroUI, Nuqs (Search Params).
- **Backend**: Azure Functions (Node 22) in einem Monorepo.
- **Datenbank**: Azure CosmosDB (SQL API).
- **Messaging**: Azure Service Bus (Event-driven Processing).
- **Infrastruktur**: Terraform (Azure Provider).
- **Tools**: `pnpm` (Frontend), `npm` (Backend/Mock), `Lefthook` (Git Hooks), `Jest` (Testing).

## 3. Projektstruktur

- `frontend/`: Next.js Applikation. Einstiegspunkt: [frontend/src/app/page.tsx](frontend/src/app/page.tsx).
- `backend/functions/`: Azure Functions Monorepo.
  - `shared/doner_types/`: Zentrale TypeScript-Typen (MUSS für Backend & Frontend genutzt werden).
  - `place-search/`: Timer-Trigger zur Entdeckung neuer Läden.
  - `image-classifier/`: Service-Bus-Trigger zur Bildklassifizierung.
  - `llm-analyzer/`: Service-Bus-Trigger für KI-Reviews.
  - `shops/`: HTTP-API für das Frontend.
- `infrastructure/`: Terraform-Konfigurationen für Azure Ressourcen.
- `api_mock/`: Express-basierter Mock-Server für lokale Entwicklung.

## 4. Architektur & Datenfluss

1. **Discovery**: `place-search` findet Läden -> Speichert in CosmosDB -> Nachricht an Service Bus.
2. **Classification**: `image-classifier` verarbeitet Bilder -> Update CosmosDB -> Nachricht an Service Bus.
3. **Analysis**: `llm-analyzer` generiert Reviews & Scores -> Update CosmosDB.
4. **Delivery**: `shops` API liefert Daten an das Frontend.

## 5. Konventionen

- **Sprache**: Striktes TypeScript.
- **Naming**: CamelCase für Variablen/Funktionen, PascalCase für Typen/Interfaces.
- **Linting/Formatting**: Prettier und ESLint werden via `Lefthook` bei jedem Commit erzwungen.
- **Umgebungsvariablen**: Dokumentation erfolgt ausschließlich über `.env.example` Dateien in den jeweiligen Ordnern.

## 6. Wichtige Befehle

### Frontend

- `pnpm install` | `pnpm dev` | `pnpm build` | `pnpm test`

### Backend

- `npm install` | `npm run check` (Lint + Types)

### API-Mock

- `npm start` (Läuft auf Port 3000)

## 7. Bekannte Einschränkungen

- **Status**: MVP/Prototyp.
- **Region**: Aktuell auf Stuttgart begrenzt.
- **Daten**: Teilweise noch Sample-Daten in der `llm-analyzer` Logik für Demo-Zwecke.

## 8. Agent-Regeln (Dos and Don'ts)

- **Shared Types**: Änderungen an Datenstrukturen MÜSSEN zuerst in [backend/functions/shared/doner_types](backend/functions/shared/doner_types) vorgenommen werden.
- **Mock-Synchronität**: Bei Änderungen am Datenmodell oder der API-Struktur MÜSSEN die JSON-Dateien in [api_mock/data/](api_mock/data/) zwingend parallel aktualisiert werden.
- **Package Manager**: Nutze `pnpm` für das Frontend und `npm` für Backend/Mock.
- **Infrastruktur**: Terraform-Dateien in [infrastructure/](infrastructure/) können frei bearbeitet werden; keine geschützten Bereiche.
- **Secrets**: Keine echten Secrets in den Code. Nutze `.env.example` als Vorlage für neue Variablen.
