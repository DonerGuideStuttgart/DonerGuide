
# DönerGuide Stuttgart

Kurzbeschreibung
-----------------

DonerGuide ist ein Prototyp-Projekt, das Dönerläden in der Region Stuttgart sammelt, analysiert und für Nutzer ansprechend darstellt. Ziel ist es, Besuchern eine schnelle Übersicht über Dönerläden zu geben und eine unterhaltsame, KI-generierte Bewertung je Laden anzubieten — inklusive Gesamt-Score, Teil-Scores und einer humorvollen Bewertungstext-Perspektive.

Was dieses Repository enthält
----------------------------

- Backend-Funktionen: Sammlung, Bilderklassifikation und LLM-basierte Analyse (Azure Functions / Node/TS). Diese Module erzeugen strukturierte Daten, die in einer Datenbank gespeichert werden.
- API-Mock: Ein lokaler, einfacher Express-Server mit Testdaten zum schnellen Entwickeln und Testen der Webseite (`/API-Mock`).
- Frontend: Eine kleine Next.js-App (React) als Demo-Frontend, das Listen- und Detailansichten zeigt.

Quickstart — Lokaler Mock-Server
--------------------------------

Der schnellste Weg, das Projekt auszuprobieren, ist der lokale API-Mock. Er liefert Beispiel-Daten für die Übersicht und Detailseiten der Dönerläden.

1. Wechsel in das Mock-Verzeichnis und installiere Abhängigkeiten

```bash
cd API-Mock
npm install
```

2. Starte den Mock-Server

```bash
npm start
```

3. Beispiele

- Übersicht: `GET http://localhost:3000/places`
- Detail: `GET http://localhost:3000/places/1`

Projektstatus & Fokus
---------------------

Dies ist ein Forschungs- und Prototyp-Projekt mit Fokus auf einem ersten, funktionsfähigen Minimalprodukt (MVP). Schwerpunkte sind:

- automatisierte Datensammlung von Dönerläden in Stuttgart
- automatisierte Bilderklassifikation (Essen / Ambiente)
- LLM-basierte, strukturierte KI-Bewertungen
- einfache Web-Oberfläche mit Listen- und Detailansicht
