import dotenv from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
/** Monorepo root (`packages/db` → `packages` → repo root). */
const repoRoot = join(__dirname, "..", "..");

/** Present before this module runs when Docker Compose / CI / shell exports `DATABASE_URL`. */
const databaseUrlFromProcessEnv = process.env.DATABASE_URL;

function loadEnvFiles(): void {
  const opts = { quiet: true } as const;
  dotenv.config({ path: join(repoRoot, ".env"), ...opts });
  dotenv.config({ path: join(repoRoot, ".env.local"), override: true, ...opts });
  dotenv.config({ path: join(repoRoot, "apps", "api", ".env"), override: true, ...opts });
}

/**
 * Default URL when `DATABASE_URL` is still unset after loading env files.
 * - Host dev: `POSTGRES_HOST` defaults to `127.0.0.1` (maps to compose-published port).
 * - In Docker: set `POSTGRES_HOST=db` (or inject a full `DATABASE_URL` with `@db`, which we preserve).
 */
function defaultDevDatabaseUrlFromEnv(): string {
  const user = process.env.POSTGRES_USER ?? "playr";
  const password = process.env.POSTGRES_PASSWORD ?? "playr";
  const database = process.env.POSTGRES_DB ?? "playr";
  const port = process.env.POSTGRES_PORT ?? "5432";
  const host = process.env.POSTGRES_HOST ?? "127.0.0.1";
  const u = encodeURIComponent(user);
  const p = encodeURIComponent(password);
  return `postgresql://${u}:${p}@${host}:${port}/${database}?schema=public`;
}

loadEnvFiles();

// Do not let repo `.env` files replace DB URL that was already set (e.g. `...@db:5432` in Docker).
if (databaseUrlFromProcessEnv) {
  process.env.DATABASE_URL = databaseUrlFromProcessEnv;
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = defaultDevDatabaseUrlFromEnv();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
