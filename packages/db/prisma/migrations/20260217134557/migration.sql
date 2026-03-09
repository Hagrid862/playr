/*
  Warnings:

  - The values [ogg] on the enum `AudioFormat` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AudioFormat_new" AS ENUM ('mp3', 'opus', 'flac', 'aac', 'wav');
ALTER TABLE "audio_files" ALTER COLUMN "format" TYPE "AudioFormat_new" USING ("format"::text::"AudioFormat_new");
ALTER TYPE "AudioFormat" RENAME TO "AudioFormat_old";
ALTER TYPE "AudioFormat_new" RENAME TO "AudioFormat";
DROP TYPE "public"."AudioFormat_old";
COMMIT;
