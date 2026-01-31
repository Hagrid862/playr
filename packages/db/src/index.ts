import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

export * from "./generated/prisma/client";
export * from "./generated/prisma/models";
export * from "./generated/prisma/enums";
export * from "./generated/prisma/commonInputTypes";
export * as browser from "./generated/prisma/browser";

export const createPrismaClient = (connectionString: string) => {
  if (!connectionString) {
    throw new Error("Database connection string is required");
  }

  if (
    !connectionString.startsWith("postgresql://") &&
    !connectionString.startsWith("postgres://")
  ) {
    throw new Error(
      "Invalid database connection string format. It should start with 'postgresql://' or 'postgres://'",
    );
  }

  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};
