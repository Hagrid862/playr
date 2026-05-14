-- CreateEnum
CREATE TYPE "GenreKind" AS ENUM ('system', 'custom');

-- DropIndex
DROP INDEX IF EXISTS "genres_name_key";

-- DropIndex
DROP INDEX IF EXISTS "genres_slug_key";

-- AlterTable
ALTER TABLE "genres" ADD COLUMN     "kind" "GenreKind" NOT NULL DEFAULT 'system',
ADD COLUMN     "libraryId" TEXT;

-- CreateIndex
CREATE INDEX "genres_slug_idx" ON "genres"("slug");

-- CreateIndex
CREATE INDEX "genres_kind_idx" ON "genres"("kind");

-- CreateIndex
CREATE INDEX "genres_libraryId_idx" ON "genres"("libraryId");

-- CreateIndex
CREATE UNIQUE INDEX "genres_global_slug_unique"
ON "genres"("slug")
WHERE "libraryId" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "genres_library_slug_unique"
ON "genres"("libraryId", "slug")
WHERE "libraryId" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "genres" ADD CONSTRAINT "genres_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed canonical system genres (idempotent)
INSERT INTO "genres" ("id", "name", "slug", "kind", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'Alternative', 'alternative', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Alternative Rock', 'alternativerock', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Ambient', 'ambient', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Anime', 'anime', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Afrobeats', 'afrobeats', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Bachata', 'bachata', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Blues', 'blues', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Bluegrass', 'bluegrass', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Bossa Nova', 'bossanova', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Children''s Music', 'childrensmusic', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Chillout', 'chillout', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Classical', 'classical', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Classic Rock', 'classicrock', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Comedy', 'comedy', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Country', 'country', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Cumbia', 'cumbia', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Dance', 'dance', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Dancehall', 'dancehall', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Death Metal', 'deathmetal', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Disco', 'disco', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Drum and Bass', 'drumandbass', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Dubstep', 'dubstep', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'EDM', 'edm', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Electronic', 'electronic', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Folk', 'folk', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Funk', 'funk', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Gospel', 'gospel', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Grunge', 'grunge', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Hard Rock', 'hardrock', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Heavy Metal', 'heavymetal', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Hip-Hop', 'hiphop', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'House', 'house', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Indie', 'indie', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Indie Pop', 'indiepop', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Indie Rock', 'indierock', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Jazz', 'jazz', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'J-Pop', 'jpop', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'K-Pop', 'kpop', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Latin', 'latin', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Lo-Fi', 'lofi', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Metal', 'metal', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'New Age', 'newage', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Nu Metal', 'numetal', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Opera', 'opera', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Pop', 'pop', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Punk', 'punk', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'R&B', 'rnb', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Rap', 'rap', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Reggae', 'reggae', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Reggaeton', 'reggaeton', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Rock', 'rock', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Salsa', 'salsa', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Singer-Songwriter', 'singersongwriter', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Ska', 'ska', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Smooth Jazz', 'smoothjazz', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Soul', 'soul', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Soundtrack', 'soundtrack', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Synth-Pop', 'synthpop', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Techno', 'techno', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Trance', 'trance', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'Trap', 'trap', 'system', NOW(), NOW()),
  (gen_random_uuid()::text, 'World', 'world', 'system', NOW(), NOW())
ON CONFLICT ("slug") WHERE ("libraryId" IS NULL) DO NOTHING;
