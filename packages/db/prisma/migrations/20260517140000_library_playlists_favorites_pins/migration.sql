-- CreateEnum
CREATE TYPE "PlaylistSystemRole" AS ENUM ('favorites');

-- AlterTable
ALTER TABLE "playlists" ADD COLUMN "systemRole" "PlaylistSystemRole";

-- AlterTable
ALTER TABLE "playlist_tracks" ADD COLUMN "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "playlist_sidebar_pins" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "libraryId" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "playlist_sidebar_pins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "playlist_sidebar_pins_libraryId_playlistId_key" ON "playlist_sidebar_pins"("libraryId", "playlistId");

-- CreateIndex
CREATE INDEX "playlist_sidebar_pins_libraryId_idx" ON "playlist_sidebar_pins"("libraryId");

-- CreateIndex
CREATE INDEX "playlist_sidebar_pins_playlistId_idx" ON "playlist_sidebar_pins"("playlistId");

-- AddForeignKey
ALTER TABLE "playlist_sidebar_pins" ADD CONSTRAINT "playlist_sidebar_pins_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlist_sidebar_pins" ADD CONSTRAINT "playlist_sidebar_pins_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "playlists_libraryId_systemRole_key" ON "playlists"("libraryId", "systemRole");

-- Backfill: one "Favorite songs" system playlist per library that does not already have an active favorites playlist
INSERT INTO "playlists" (
    "id",
    "name",
    "description",
    "isPublic",
    "isCollaborative",
    "systemRole",
    "libraryId",
    "artistId",
    "coverId",
    "createdAt",
    "updatedAt",
    "deletedAt"
)
SELECT
    replace(gen_random_uuid()::text, '-', ''),
    'Favorite songs',
    NULL,
    false,
    false,
    'favorites'::"PlaylistSystemRole",
    l.id,
    NULL,
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    NULL
FROM "libraries" l
WHERE l."deletedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "playlists" p
    WHERE p."libraryId" = l.id
      AND p."systemRole" = 'favorites'::"PlaylistSystemRole"
      AND p."deletedAt" IS NULL
  );
