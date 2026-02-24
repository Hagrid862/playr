---
trigger: always_on
---

# Package Manager & Commands Guide for AI Agents

## Core Rules

1. **Always Use `pnpm`:** This project exclusively uses `pnpm`. DO NOT use standard `npm` or `yarn`.
2. **Monorepo Architecture:** The project is a monorepo powered by Turborepo (`turbo`).
3. **Running Commands:** Run all commands from the root directory. To run a command for a single package/app, use the `--filter` flag (e.g., `pnpm run <command> --filter <package-name>`).
4. **DO NOT Run `pnpm dev`:** NEVER use `pnpm dev` or `pnpm dev:host`. We assume the application is already running in Docker Compose.
5. **Rebuilding & Restarting:** If you modify dependencies (`package.json`), configuration files, or other packages that require a rebuild, DO NOT run dev commands. Instead, restart the Docker Compose containers to apply changes, reinstall dependencies, and rebuild the packages by running:
   `docker compose restart`

## Available Commands

Here are all the commands available in the root `package.json` that you MUST use when appropriate instead of running native binary commands directly:

### Building & Running

- `pnpm build`: Builds all applications and packages via turbo.
- `pnpm start`: Starts the built application.
- `pnpm dev` / `pnpm dev:host`: **NEVER USE THESE** (see rule #4 above).

### Linting & Formatting

- `pnpm lint`: Runs ESLint across the monorepo via turbo.
- `pnpm format`: Automatically formats all `.ts`, `.tsx`, and `.md` files using Prettier.
- `pnpm format:check`: Checks if formatting is correct using Prettier (without writing changes).
- `pnpm check-types`: Runs TypeScript type checking via turbo.

### Testing

- `pnpm test`: Runs ALL tests (unit, integration, and e2e) across all apps. Do not use `--filter` with this command, as it's meant to run everything from the root.
- `pnpm test:unit`: Runs only unit tests via turbo.
- `pnpm test:integration`: Runs only integration tests via turbo.
- `pnpm test:e2e`: Runs only end-to-end tests via turbo.
- `pnpm test:coverage`: Runs tests and generates a test coverage report.

### Database (Prisma)

- `pnpm prisma:generate`: Generates Prisma client via turbo.
- `pnpm prisma:migrate`: Runs database migrations via turbo.
- `pnpm prisma:push`: Pushes schema state to the database via turbo.
- `pnpm prisma:studio`: Opens Prisma Studio for database viewing/editing.
