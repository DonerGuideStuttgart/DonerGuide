# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DonerGuide Stuttgart backend - Azure Functions monorepo that collects, analyzes, and serves Döner restaurant data using a serverless event-driven pipeline.

**Tech Stack**: TypeScript 5.9, Node.js 22+, Azure Functions v4, Cosmos DB, Service Bus, Google Places API (New)

## Architecture

Multi-stage async processing pipeline:

```
Grid Generator (Timer) → grid-points queue
    ↓
Place Search (Queue) → places queue → Cosmos DB
    ↓
Image Classifier (Queue) → images-classified queue
    ↓
LLM Analyzer (Queue) → Cosmos DB
    ↓
Shops API (HTTP) ← reads from Cosmos DB
```

### Functions

- **place-search**: Timer generates Stuttgart coordinate grid; queue triggers Google Places searches at each point
- **image-classifier**: Classifies shop photos as food/ambiance
- **llm-analyzer**: Generates AI-based reviews from classified images
- **shops**: HTTP API endpoints (`GET /api/shops`, `GET /api/shops/{id}`)
- **shared/doner_types**: Shared TypeScript interfaces (Place, Photo, StoreAnalysis, etc.)

## Commands

Run from `functions/` directory:

```bash
# All workspaces
npm install                 # Install all dependencies
npm run lint                # ESLint with TypeScript
npm run lint:fix            # Fix lint issues
npm run format              # Prettier format
npm run format:check        # Check formatting
npm run types:check         # TypeScript type check
npm run test                # Jest tests
npm run check               # lint + format + types combined
npm run prepare-hooks       # Install Lefthook git hooks (once)

# Individual function (from function directory)
npm run dev                 # Watch mode + local Azure Functions
npm run build               # Compile TypeScript
npm run start               # Start function locally
```

## Local Development

Full stack with Docker:
```bash
docker-compose up           # Starts functions + Azure emulators
```

Or run individual functions:
```bash
cd functions/place-search
npm install && npm run dev
```

## Code Style

- ESLint strict + stylistic TypeScript rules
- Prettier: 120 char width, double quotes, 2-space indent, semicolons
- TypeScript strict mode enabled
- Prefix unused variables with `_`

## Key Directories

```
functions/
├── shared/doner_types/     # Shared type definitions
├── place-search/           # Grid generation + place search
├── image-classifier/       # Photo classification
├── llm-analyzer/           # AI review generation
├── shops/                  # HTTP API
└── helper/service-bus-reader/  # Dev utility for inspecting queues
```

## Environment Variables

Each function has `local.settings.json`. Key variables:
- `*_SERVICEBUS_CONNECTION_STRING` - Service Bus connection
- `*_COSMOSDB_CONNECTION_STRING` - Cosmos DB connection
- `GOOGLE_PLACES_API_KEY` - Google Places API
- Service Bus queues: `grid-points`, `places`, `images-classified`
