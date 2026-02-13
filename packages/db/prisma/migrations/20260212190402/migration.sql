/*
  Warnings:

  - You are about to drop the `private_artist_profiles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_private_profiles` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AccessRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'PRIVATE', 'COMMUNITY');

-- DropForeignKey
ALTER TABLE "private_artist_profiles" DROP CONSTRAINT "private_artist_profiles_artistId_fkey";

-- DropForeignKey
ALTER TABLE "private_artist_profiles" DROP CONSTRAINT "private_artist_profiles_userPrivateProfileId_fkey";

-- DropForeignKey
ALTER TABLE "user_private_profiles" DROP CONSTRAINT "user_private_profiles_userId_fkey";

-- AlterTable
ALTER TABLE "albums" ADD COLUMN     "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "artists" ADD COLUMN     "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC';

-- DropTable
DROP TABLE "private_artist_profiles";

-- DropTable
DROP TABLE "user_private_profiles";

-- CreateTable
CREATE TABLE "artist_access" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "AccessRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artist_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "album_access" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "AccessRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "album_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "track_access" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "AccessRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "track_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "artist_access_artistId_idx" ON "artist_access"("artistId");

-- CreateIndex
CREATE INDEX "artist_access_userId_idx" ON "artist_access"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "artist_access_artistId_userId_key" ON "artist_access"("artistId", "userId");

-- CreateIndex
CREATE INDEX "album_access_albumId_idx" ON "album_access"("albumId");

-- CreateIndex
CREATE INDEX "album_access_userId_idx" ON "album_access"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "album_access_albumId_userId_key" ON "album_access"("albumId", "userId");

-- CreateIndex
CREATE INDEX "track_access_trackId_idx" ON "track_access"("trackId");

-- CreateIndex
CREATE INDEX "track_access_userId_idx" ON "track_access"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "track_access_trackId_userId_key" ON "track_access"("trackId", "userId");

-- AddForeignKey
ALTER TABLE "artist_access" ADD CONSTRAINT "artist_access_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_access" ADD CONSTRAINT "artist_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_access" ADD CONSTRAINT "album_access_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_access" ADD CONSTRAINT "album_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_access" ADD CONSTRAINT "track_access_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_access" ADD CONSTRAINT "track_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
