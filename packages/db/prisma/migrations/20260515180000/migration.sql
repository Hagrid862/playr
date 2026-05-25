-- Adds albums.libraryId, backfills from library_albums for unknown_bucket albums,
-- and enforces one active unknown-bucket album per library.
-- AlbumSystemKind enum and albums.systemKind column are created in migration 20260514174243.

-- AlterTable
ALTER TABLE "albums" ADD COLUMN "libraryId" TEXT;

-- AddForeignKey
ALTER TABLE "albums" ADD CONSTRAINT "albums_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: tie unknown_bucket albums to their library via an active library_album row
-- One deterministic libraryId per album (smallest libraryId when multiple library_albums exist)
UPDATE "albums" AS a
SET "libraryId" = pick."libraryId"
FROM (
  SELECT DISTINCT ON (la."albumId")
    la."albumId",
    la."libraryId"
  FROM "library_albums" AS la
  INNER JOIN "albums" AS alb ON alb.id = la."albumId"
  WHERE la."deletedAt" IS NULL
    AND alb."systemKind" = 'unknown_bucket'::"AlbumSystemKind"
    AND alb."deletedAt" IS NULL
  ORDER BY la."albumId", la."libraryId" ASC
) AS pick
WHERE a.id = pick."albumId";

-- Enforce single canonical unknown-bucket album per library among active rows
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT "libraryId", COUNT(*)::int AS c
      FROM "albums"
      WHERE "systemKind" = 'unknown_bucket'::"AlbumSystemKind"
        AND "deletedAt" IS NULL
        AND "libraryId" IS NOT NULL
      GROUP BY "libraryId"
      HAVING COUNT(*) > 1
    ) AS dup
  ) THEN
    RAISE EXCEPTION 'Migration blocked: more than one active unknown_bucket album exists for the same libraryId';
  END IF;
END $$;

-- CreateIndex (partial unique)
CREATE UNIQUE INDEX "albums_one_active_unknown_bucket_per_library_idx" ON "albums" ("libraryId") WHERE ("systemKind" = 'unknown_bucket'::"AlbumSystemKind" AND "deletedAt" IS NULL AND "libraryId" IS NOT NULL);
