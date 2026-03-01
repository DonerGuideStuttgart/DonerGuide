# DönerGuide Stuttgart

DönerGuide ist ein Prototyp-Projekt, das Dönerläden in der Region Stuttgart sammelt, analysiert und für Nutzer ansprechend darstellt. Ziel ist es, Besuchern eine schnelle Übersicht über Dönerläden zu geben und eine unterhaltsame, KI-generierte Bewertung je Laden anzubieten — inklusive Gesamt-Score, Teil-Scores und einer humorvollen Bewertungstext-Perspektive.

## Tech-Stack
- **Frontend**: Next.js (React), Tailwind CSS (DaisyUI), Mapbox GL
- **Backend**: Node.js / TypeScript, Azure Functions (Microservices-Architektur)
- **Daten & Messaging**: Azure Cosmos DB, Azure Service Bus
- **Infrastruktur**: Terraform (Azure), Docker Compose (für die lokale Entwicklung mit Emulatoren)

## Aufbau des Repos
- `frontend/`: Die Next.js-Webanwendung, die Listen- und Detailansichten sowie eine interaktive Karte der Läden bereitstellt.
- `backend/`: Beinhaltet die Backend-Services als Azure Functions (u.a. `place-search`, `image-classifier`, `llm-analyzer`, `image-generator`, `shops`). Enthält zudem eine `compose.yaml` für das lokale Ausführen aller Services inkl. lokaler Emulatoren für Services wie Cosmos DB und Service Bus.
- `api_mock/`: Ein lokaler, einfacher Express-Server mit Testdaten zum schnellen Entwickeln und Testen der Webseite, falls das vollumfängliche Backend gerade nicht benötigt wird.
- `infrastructure/`: Terraform-Skripte für die Provisionierung der benötigten Cloud-Ressourcen in Microsoft Azure.

## Lokale Entwicklung

### Frontend starten
Für die UI-Entwicklung kann das Frontend als eigenständiges Next.js Projekt gestartet werden:

```bash
cd frontend
npm install
npm run dev
```

Die App ist anschließend unter `http://localhost:3000` erreichbar.

### Backend starten
Das gesamte Backend inklusive aller Azure Functions und der dafür notwendigen lokalen Emulatoren (Service Bus, Cosmos DB, Azurite) kann bequem über Docker Compose gestartet werden. Dazu die .env.example Dateien in den Functions als .env Dateien kopieren und ggf. anpassen. Dann kann das Backend mit folgendem Befehl gestartet werden:

```bash
cd backend
docker compose up
```

Nachdem die Container gebaut und gestartet wurden, sind die einzelnen APIs lokal auf den entsprechenden lokalen Ports (definiert in der `compose.yaml`) der Azure Functions verfügbar (z.B. Port `7074` für die Shops API). Auf die Datenbank kann über den Emulator auf Port `1234` zugegriffen werden.

### Alternativ: API-Mock Server nutzen
Wer das Backend nicht über Docker starten möchte, kann für die alleinige Frontend-Entwicklung auch den leichtgewichtigen Mock-Server nutzen. Er liefert statische Beispiel-Daten für die UI beziehungsweise Detailseiten:

```bash
cd api_mock
npm install
npm start
```
