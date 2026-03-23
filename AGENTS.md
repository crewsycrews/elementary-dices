# AGENTS.md

Guidance for coding agents working in `elementary-dices`.

## Mission

- Keep gameplay behavior stable while improving code quality and developer velocity.
- Prefer small, verifiable changes with clear rollback paths.
- Preserve type safety across `client`, `server`, and `shared`.

## Repo Map

- `client/`: Vue 3 app (views, stores, composables, UI components)
- `server/`: Elysia API with feature modules + Knex/Postgres
- `shared/`: shared API/types/schemas used by both client and server
- `server/migrations/`: DB schema history
- `server/seeds/`: initial/reference game data

## Core Commands

Run from repo root unless noted:

- Install deps: `bun install`
- Start full app: `bun run dev`
- Start server only: `bun run dev:server`
- Start client only: `bun run dev:client`
- Typecheck all: `bun run typecheck`

Server DB commands:
- Migrate: `bun --filter @elementary-dices/server db:migrate`
- Rollback: `bun --filter @elementary-dices/server db:migrate:rollback`
- Seed: `bun --filter @elementary-dices/server db:seed`

## Environment

- Copy `server/.env.example` to `server/.env`.
- Required areas: PostgreSQL settings, JWT secrets, Google OAuth vars, `CLIENT_URL`.
- Local defaults assume:
  - client: `http://localhost:5173`
  - server: `http://localhost:3000`

## Architecture Conventions

Backend (`server/modules/<feature>`):
- `index.ts`: routes and validation wiring
- `service.ts`: business logic and orchestration
- `repository.ts`: database access
- `models.ts`: DTOs/schemas/types

Frontend:
- Route views in `client/src/views`
- Reusable gameplay UI in `client/src/components/game`
- Global state in `client/src/stores`
- Network helpers in `client/src/composables`

Shared package:
- Keep cross-package contracts in `shared/src`.
- When changing API response shapes, update both server handlers and consuming client code.
- Prefer full type-safety through the Elysia Eden client end-to-end; avoid `any` and `@ts-expect-error` for API calls unless there is a documented, temporary blocker.

## Change Rules

- Keep edits focused; avoid unrelated refactors in same change.
- Respect existing naming and module boundaries.
- Do not hardcode secrets or environment-specific credentials.
- Early-stage iteration policy: backward compatibility is not required unless explicitly requested by the user for a specific task.
- For DB schema changes:
  - add a migration
  - update related repositories/services
  - ensure seed compatibility where relevant

## High-Risk Areas

- `server/modules/events/service.ts` is large and stateful.
- Auth and token flows span:
  - `server/modules/auth/*`
  - `server/modules/users/index.ts` protected routes
  - `client/src/composables/useApi.ts` refresh behavior
  - `client/src/stores/user.ts`
- `shared/src/api.ts` and shared types impact compile-time contracts in multiple packages.

## Validation Checklist

Before finishing:

1. Run type checks:
   - `bun run typecheck`
   - On Windows agent sessions, do not run typecheck in the agent sandbox; ask the user to run it locally and report results.
2. If backend data logic changed:
   - run relevant migrations/seeds as needed
   - hit `/api/health`
3. If auth/event flows changed:
   - smoke test login/session persistence and event transitions
4. Summarize:
   - files changed
   - behavior impact
   - follow-up risks or TODOs

## Known Product Caveats

- Current password hashing is placeholder logic in auth service and is not production-grade.
- API docs in `server/API.md` are useful but may lag behind implementation; verify routes in module `index.ts` files when in doubt.
