# USE Web Frontend

Eigenstaendiges React/TypeScript-Frontend fuer das neue webbasierte UML/OCL-System.

Dieses Repository ist keine Migration der alten USE-Desktop-GUI und verwendet keinen alten USE-Core als Dependency. Die fachliche Validierung liegt im geplanten Backend; das Frontend ist fuer Darstellung, Interaktion, Layout und API-Kommunikation verantwortlich.

## Voraussetzungen

- Node.js 20 oder neuer
- npm 10 oder neuer

## Befehle

```bash
npm install
npm run dev
npm run build
npm test
npm run smoke:backend
npm run lint
```

## Backend Integration Smoke Test

Frontend-Schritt 5a prueft die Integration gegen das lokale Spring-Boot-Backend in `../use-web-backend`.

Backend starten:

```bash
cd ../use-web-backend
mvn spring-boot:run
```

Smoke-Test im Frontend ausfuehren:

```bash
cd ../use-web-frontend
npm run smoke:backend
```

Der Smoke-Test nutzt standardmaessig `http://localhost:8080/api/v1`, passend zum aktuellen Spring-Boot-Default von `use-web-backend`. Die URL kann ueber `USE_WEB_BACKEND_URL` oder `VITE_API_BASE_URL` ueberschrieben werden.

Fuer Browser-Tests gegen das echte Backend koennen die Werte aus `.env.backend.example` verwendet werden:

```text
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

Die Datei `.env.local` aktiviert diese Einstellung lokal. Nach Aenderungen an Vite-Environment-Variablen muss der Dev-Server neu gestartet werden.

Der Dashboard-Button `Start Project` verwendet den konfigurierten Backend-Endpoint `POST /api/v1/projects`. Der Smoke-Test `npm run smoke:backend` nutzt direkt `USE_WEB_BACKEND_URL`/`VITE_API_BASE_URL` oder den Default `http://localhost:8080/api/v1`.

## Struktur

```text
src/
  app/          App-Einstieg und spaetere Provider
  api/          REST-API-Client und DTO-Mapping
  components/   Wiederverwendbare UI-Komponenten
  features/     Fachliche Feature-Module
  pages/        Spaetere Seiten wie Dashboard und Diagramm-Views
  state/        Client/UI-State
  styles/       Globale Styles und Design Tokens
  test/         Test-Setup und Test-Helfer
  types/        Geteilte TypeScript-Typen
  utils/        Hilfsfunktionen
```

## MVP-Kontext

Der spaetere Nutzerfluss startet mit dem Dashboard:

```text
Dashboard -> Start Project -> Class Diagram -> Object Diagram -> Check Constraints
```

Dieses Setup implementiert noch keine fachlichen Views. Dashboard, Routing, Diagrammkomponenten, API-Client und Validation UI folgen in separaten Umsetzungsschritten.
