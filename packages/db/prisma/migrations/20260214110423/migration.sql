/*
  Warnings:

  - You are about to drop the column `role` on the `album_access` table. All the data in the column will be lost.
  - You are about to drop the column `visibility` on the `albums` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `artist_access` table. All the data in the column will be lost.
  - You are about to drop the column `visibility` on the `artists` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `track_access` table. All the data in the column will be lost.
  - You are about to drop the column `visibility` on the `tracks` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "album_access" DROP COLUMN "role";

-- AlterTable
ALTER TABLE "albums" DROP COLUMN "visibility";

-- AlterTable
ALTER TABLE "artist_access" DROP COLUMN "role";

-- AlterTable
ALTER TABLE "artists" DROP COLUMN "visibility";

-- AlterTable
ALTER TABLE "track_access" DROP COLUMN "role";

-- AlterTable
ALTER TABLE "tracks" DROP COLUMN "visibility";

-- DropEnum
DROP TYPE "AccessRole";

-- DropEnum
DROP TYPE "Visibility";
