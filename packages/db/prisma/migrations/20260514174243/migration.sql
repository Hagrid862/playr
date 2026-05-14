-- CreateEnum
CREATE TYPE "AlbumSystemKind" AS ENUM ('none', 'unknown_bucket');

-- CreateEnum
CREATE TYPE "OtpCodeType" AS ENUM ('emailVerification', 'passwordReset');

-- AlterTable
ALTER TABLE "albums" ADD COLUMN     "systemKind" "AlbumSystemKind" NOT NULL DEFAULT 'none';

-- CreateIndex
CREATE INDEX "albums_systemKind_idx" ON "albums"("systemKind");
