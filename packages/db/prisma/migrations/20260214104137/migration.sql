/*
  Warnings:

  - The values [OWNER,EDITOR,VIEWER] on the enum `AccessRole` will be removed. If these variants are still used in the database, this will fail.
  - The values [PUBLIC,PRIVATE,COMMUNITY] on the enum `Visibility` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AccessRole_new" AS ENUM ('owner', 'editor', 'viewer');
ALTER TABLE "public"."album_access" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "public"."artist_access" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "public"."track_access" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "artist_access" ALTER COLUMN "role" TYPE "AccessRole_new" USING ("role"::text::"AccessRole_new");
ALTER TABLE "album_access" ALTER COLUMN "role" TYPE "AccessRole_new" USING ("role"::text::"AccessRole_new");
ALTER TABLE "track_access" ALTER COLUMN "role" TYPE "AccessRole_new" USING ("role"::text::"AccessRole_new");
ALTER TYPE "AccessRole" RENAME TO "AccessRole_old";
ALTER TYPE "AccessRole_new" RENAME TO "AccessRole";
DROP TYPE "public"."AccessRole_old";
ALTER TABLE "album_access" ALTER COLUMN "role" SET DEFAULT 'viewer';
ALTER TABLE "artist_access" ALTER COLUMN "role" SET DEFAULT 'viewer';
ALTER TABLE "track_access" ALTER COLUMN "role" SET DEFAULT 'viewer';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "Visibility_new" AS ENUM ('public', 'private', 'community');
ALTER TABLE "public"."albums" ALTER COLUMN "visibility" DROP DEFAULT;
ALTER TABLE "public"."artists" ALTER COLUMN "visibility" DROP DEFAULT;
ALTER TABLE "public"."tracks" ALTER COLUMN "visibility" DROP DEFAULT;
ALTER TABLE "artists" ALTER COLUMN "visibility" TYPE "Visibility_new" USING ("visibility"::text::"Visibility_new");
ALTER TABLE "albums" ALTER COLUMN "visibility" TYPE "Visibility_new" USING ("visibility"::text::"Visibility_new");
ALTER TABLE "tracks" ALTER COLUMN "visibility" TYPE "Visibility_new" USING ("visibility"::text::"Visibility_new");
ALTER TYPE "Visibility" RENAME TO "Visibility_old";
ALTER TYPE "Visibility_new" RENAME TO "Visibility";
DROP TYPE "public"."Visibility_old";
ALTER TABLE "albums" ALTER COLUMN "visibility" SET DEFAULT 'public';
ALTER TABLE "artists" ALTER COLUMN "visibility" SET DEFAULT 'public';
ALTER TABLE "tracks" ALTER COLUMN "visibility" SET DEFAULT 'public';
COMMIT;

-- AlterTable
ALTER TABLE "album_access" ALTER COLUMN "role" SET DEFAULT 'viewer';

-- AlterTable
ALTER TABLE "albums" ALTER COLUMN "visibility" SET DEFAULT 'public';

-- AlterTable
ALTER TABLE "artist_access" ALTER COLUMN "role" SET DEFAULT 'viewer';

-- AlterTable
ALTER TABLE "artists" ALTER COLUMN "visibility" SET DEFAULT 'public';

-- AlterTable
ALTER TABLE "track_access" ALTER COLUMN "role" SET DEFAULT 'viewer';

-- AlterTable
ALTER TABLE "tracks" ALTER COLUMN "visibility" SET DEFAULT 'public';
