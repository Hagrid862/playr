# Testing Guide

## Overview

This monorepo uses two test runners:

- **Vitest** — Unit & integration tests (`apps/api`, frontend apps)
- **Playwright** — End-to-end tests (`apps/e2e`)

The `@repo/testing` package provides builders (data builders, request builders), NestJS test utilities (`PrismaServiceMock`, `createPrismaMock`, `createMockProviders`), and web test helpers (`customRender` with React Query providers).

## Commands (from root)

| Command | What it runs |
|---|---|
| `pnpm test` | All tests (unit + integration + e2e) |
| `pnpm test:unit` | All unit tests |
| `pnpm test:integration` | API integration tests |
| `pnpm test:e2e` | Playwright E2E tests |

## Running tests in a specific package

```sh
pnpm --filter @repo/api test:unit
pnpm --filter @repo/api test:integration
pnpm --filter @repo/e2e test:e2e
```

## Filtering tests

### Vitest (unit / integration)

Use `--` to pass flags through pnpm/turbo to vitest:

```sh
# By name (pattern match)
pnpm --filter @repo/api test:unit -- -t "verify email"

# By file path
pnpm --filter @repo/api test:unit -- auth

# Watch mode
pnpm --filter @repo/api test:watch
```

### Playwright (E2E)

```sh
# By project (web, admin, artist, api)
pnpm --filter @repo/e2e test:e2e -- --project=web

# By file name
pnpm --filter @repo/e2e test:e2e -- auth

# UI mode
pnpm --filter @repo/e2e test:e2e:ui

# Debug mode
pnpm --filter @repo/e2e test:e2e:debug
```

## How tests are structured

### Unit tests (`apps/api/**/*.spec.ts`)

Co-located with source code, tested via NestJS testing utilities. Use Vitest with SWC (decorator support for NestJS DI). The `@repo/testing` package provides `createPrismaMock()` and `createMockProviders()` to mock Prisma and NestJS providers.

```ts
// Example pattern
describe('VerifyEmailHandler', () => {
  it('should verify a user email', async () => { ... })
})
```

Vitest globals (`describe`, `it`, `expect`) are available without imports.

### Integration tests (`apps/api/integration/*.int-spec.ts`)

Test NestJS modules end-to-end with a mocked Prisma and BullMQ. Uses the `createIntegrationApp()` helper from `apps/api/integration/test-utils.ts`. Files use the `.int-spec.ts` extension and are discovered by a separate vitest config.

```ts
// Example pattern
describe('AuthController (e2e)', () => {
  it('POST /auth/register', async () => { ... })
})
```

### E2E tests (`apps/e2e/src/**/*.spec.ts`)

Playwright tests organized by app in subdirectories: `web/`, `admin/`, `artist/`, `api/`. Each maps to a Playwright project in `playwright.config.ts` with its own base URL.

- CI: one worker, two retries, forbids `.only`
- Local: four workers, no retries

## Coverage

```sh
pnpm test:coverage
```

Backend coverage uses v8 provider, exclusions for modules, DTOs, commands, queries.