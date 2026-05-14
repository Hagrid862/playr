-- CreateEnum
CREATE TYPE "OtpCodeType" AS ENUM ('emailVerification', 'passwordReset');

-- DropIndex
DROP INDEX "albums_name_trgm_idx";

-- DropIndex
DROP INDEX "artists_name_trgm_idx";

-- DropIndex
DROP INDEX "tracks_title_trgm_idx";
