import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { withPgTrgm } from "prisma-extension-pg-trgm";

export * from "./generated/prisma/client";
export * from "./generated/prisma/models";
export * from "./generated/prisma/enums";
export * from "./generated/prisma/commonInputTypes";
export * as browser from "./generated/prisma/browser";
export { Prisma } from "./generated/prisma/client";

export const createPrismaClient = (connectionString: string) => {
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

export const createExtendedPrismaClient = (connectionString: string) => {
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter }).$extends(withPgTrgm());
};

export type ExtendedPrismaClient = ReturnType<typeof createExtendedPrismaClient>;
export type PrismaTransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
