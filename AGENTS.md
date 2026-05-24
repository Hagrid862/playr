# Playr - AI Agent Guide

## Architecture

**Monorepo** powered by Turborepo. Key apps:

- `apps/api` - NestJS backend with CQRS pattern
- `apps/web` - TanStack Router + React frontend
- `apps/e2e` - Playwright end-to-end tests

**API Pattern**: CQRS with `@nestjs/cqrs`. Commands in `features/*/commands/`, queries in `features/*/queries/`. Example: [`apps/api/src/features/auth/commands/impl/login.command.ts`](apps/api/src/features/auth/commands/impl/login.command.ts) and [`apps/api/src/features/auth/commands/handlers/login.handler.ts`](apps/api/src/features/auth/commands/handlers/login.handler.ts).

**Shared Module**: [`apps/api/src/shared/shared.module.ts`](apps/api/src/shared/shared.module.ts) provides global services (Prisma, guards, repositories) with `@Global()`.

**Real-time**: Playback state syncs via Socket.IO namespace `/playback` with optimistic locking. See [`apps/api/src/features/playback/docs.md`](apps/api/src/features/playback/docs.md).

## Development Workflow

**Start**: `pnpm dev` (assumes Docker Compose is running; see `.cursor/rules/never-run-pnpm-dev.mdc`).

**Testing**:

- Unit: `pnpm test:unit` (vitest)
- Integration: `pnpm test:integration` (vitest with mocked Prisma)
- E2E: `pnpm test:e2e` (Playwright)

**Prisma**: `pnpm prisma:generate` before type checks. Schema in `packages/db/prisma/`.

**Build**: `pnpm build` (turbo runs all apps).

## Key Patterns

**API Testing** (from `.cursor/rules/api-testing.mdc`):

- Unit tests: `createMock<T>()` and `DeepMocked<T>` from `@repo/testing/nestjs`
- Builders: `trackBuilder`, `albumBuilder`, `userBuilder` from `@repo/testing`
- Integration: `createIntegrationApp()` from `apps/api/integration/test-utils`

**Web Testing** (from `.cursor/rules/web-testing.mdc`):

- Co-locate `*.test.ts` with source
- Use `customRender` or `customRenderWithRouter` from `@repo/testing/web`
- Zustand: `vi.mocked(usePlayerStore).mockReturnValue(createPlayerStoreMock({...}))`

**Web State**: Zustand stores in `apps/web/src/stores/`. Player store uses action modules: [`apps/web/src/stores/player-store/player-store.actions.playback.ts`](apps/web/src/stores/player-store/player-store.actions.playback.ts).

**API Client**: [`apps/web/src/lib/api-client.ts`](apps/web/src/lib/api-client.ts) handles JWT refresh automatically.

**Environment**: Copy `.env.example` to `.env`. Docker services: Postgres, Redis, MinIO, Mailhog.

## External Services

- **Database**: PostgreSQL (via Prisma)
- **Cache/Queue**: Redis (BullMQ for background jobs)
- **Storage**: MinIO (S3-compatible)
- **Email**: Mailhog (dev) / SMTP (prod)

## Code Generation

- API routes: TanStack Router file-based routing in `apps/web/src/routes/`
- Run `pnpm run build` to regenerate `routeTree.gen.ts`
