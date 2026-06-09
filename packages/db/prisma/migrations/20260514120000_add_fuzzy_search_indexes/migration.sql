-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateTrigramIndexes
CREATE INDEX IF NOT EXISTS "artists_name_trgm_idx" ON "artists" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "albums_name_trgm_idx" ON "albums" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "tracks_title_trgm_idx" ON "tracks" USING gin ("title" gin_trgm_ops);
