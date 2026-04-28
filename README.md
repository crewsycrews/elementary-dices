# Elementary Dice

Elementary Dice is a full-stack monster-collection game prototype where players collect elementals, roll elemental dice, trigger random events, and evolve their party over time.

This repository is a Bun workspace monorepo with:
- `client`: Vue 3 + Vite frontend
- `server`: Elysia + PostgreSQL backend API
- `shared`: shared TypeScript contracts (types, schemas, Eden API typing)

## Stack

- Runtime and package manager: Bun
- Frontend: Vue 3, Vue Router, Pinia, Vite, TailwindCSS
- Backend: Elysia, Knex, PostgreSQL
- API typing: Eden Treaty via shared package
- Auth: username/password + Google OAuth (HTTP-only cookie tokens)

## Monorepo Layout

```text
.
|-- client/         # Vue app (views, stores, components)
|-- server/         # Elysia API, modules, migrations, seeds
|-- shared/         # Cross-package types/schemas/api typing
|-- package.json    # Workspace scripts
`-- README.md
```

## Prerequisites

- Bun (latest stable recommended)
- Docker (recommended for local PostgreSQL), or a local PostgreSQL instance

## Quick Start

1. Install dependencies from repo root:
```bash
bun install
```

2. Create server environment file:
```bash
cp server/.env.example server/.env
```

3. Start PostgreSQL (from `server/`):
```bash
docker compose up -d
```

4. Run database migrations:
```bash
bun --filter @elementary-dices/server db:migrate
```

5. Seed initial data:
```bash
bun --filter @elementary-dices/server db:seed
```

6. Start client and server together (from repo root):
```bash
bun run dev
```

App URLs:
- Client: `http://localhost:5173`
- Server: `http://localhost:3000`
- API health: `http://localhost:3000/api/health`

## Environment Variables

Use [`server/.env.example`](/c:/projects/elementary-dices/server/.env.example) as the source of truth.

Important variables:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `CLIENT_URL`, `SERVER_URL`, `NODE_ENV`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

Notes:
- Server currently listens on `3000` in code.
- Client default API target is `http://localhost:3000`.
- For OAuth, `GOOGLE_REDIRECT_URI` must match Google Console settings.

## Scripts

### Root scripts

- `bun run dev`: starts both server and client
- `bun run dev:server`: starts only server workspace
- `bun run dev:client`: starts only client workspace
- `bun run build`: build all workspaces
- `bun run typecheck`: typecheck all workspaces that expose this script
- `bun run test`: run test scripts for workspaces that expose one

### Server scripts (`server/package.json`)

- `bun run dev`: run API in watch mode
- `bun run build`: compile TypeScript
- `bun run typecheck`: TypeScript no-emit check
- `bun run db:migrate`: apply latest migrations
- `bun run db:migrate:make`: create migration
- `bun run db:migrate:rollback`: rollback migration batch
- `bun run db:seed`: run seeds
- `bun run db:seed:make`: create seed file

### Client scripts (`client/package.json`)

- `bun run dev`: start Vite dev server
- `bun run build`: typecheck + Vite build
- `bun run preview`: preview built app

## API Overview

Main API modules are registered in [`server/index.ts`](/c:/projects/elementary-dices/server/index.ts):
- `/api/auth`
- `/api/users`
- `/api/player-elementals`
- `/api/elementals`
- `/api/dice`
- `/api/items`
- `/api/rolls`
- `/api/events`
- `/api/evolution`

Detailed endpoint reference is in [`server/API.md`](/c:/projects/elementary-dices/server/API.md).

## Game Flow Summary

Typical gameplay loop:
1. Register or login (password or Google OAuth).
2. Build and manage active party + dice loadout.
3. Trigger events (wild encounter, PvP battle, merchant).
4. Resolve outcomes via dice and battle systems.
5. Evolve elementals and continue progression.

## Development Notes

- The backend follows a feature module structure:
  - `index.ts` for route/controller wiring
  - `service.ts` for business logic
  - `repository.ts` for data access
  - `models.ts` for DTOs/schemas
- Shared contracts live in `shared/src` and are consumed by both client and server.
- Event and battle logic is concentrated in `server/modules/events`.

## Security and Auth Notes

- Tokens are issued and refreshed via HTTP-only cookies.
- OAuth uses Google via Arctic.
- Password hashing in the current auth service is a placeholder implementation (`hashed_<password>`). Do not use as-is for production.

## Troubleshooting

- API cannot connect to DB:
  - Confirm PostgreSQL is running and `.env` credentials match.
  - Check health endpoint: `/api/health`.
- OAuth login fails:
  - Verify Google credentials and redirect URI.
  - Ensure `CLIENT_URL` and `SERVER_URL` are correct.
- Client cannot reach server:
  - Confirm server is running on `3000`.
  - Check browser network errors and CORS/cookie behavior.
