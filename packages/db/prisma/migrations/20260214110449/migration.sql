-- CreateEnum
CREATE TYPE "AccessRole" AS ENUM ('owner', 'editor', 'viewer');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('public', 'private', 'community');

-- AlterTable
ALTER TABLE "album_access" ADD COLUMN     "role" "AccessRole" NOT NULL DEFAULT 'viewer';

-- AlterTable
ALTER TABLE "albums" ADD COLUMN     "visibility" "Visibility" NOT NULL DEFAULT 'public';

-- AlterTable
ALTER TABLE "artist_access" ADD COLUMN     "role" "AccessRole" NOT NULL DEFAULT 'viewer';

-- AlterTable
ALTER TABLE "artists" ADD COLUMN     "visibility" "Visibility" NOT NULL DEFAULT 'public';

-- AlterTable
ALTER TABLE "track_access" ADD COLUMN     "role" "AccessRole" NOT NULL DEFAULT 'viewer';

-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "visibility" "Visibility" NOT NULL DEFAULT 'public';
