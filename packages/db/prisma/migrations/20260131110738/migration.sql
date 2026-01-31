-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('created', 'pending', 'verified');

-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('primary', 'recovery');

-- CreateEnum
CREATE TYPE "AlbumType" AS ENUM ('album', 'single', 'ep', 'compilation');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('user', 'guest', 'admin', 'artist');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('created', 'inReview', 'accepted', 'rejected');

-- CreateEnum
CREATE TYPE "CommunityReactionType" AS ENUM ('like', 'dislike');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "CreditRole" AS ENUM ('producer', 'songwriter', 'composer', 'arranger', 'engineer', 'mixer', 'masterer', 'featuring', 'remixer');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('error', 'default', 'success', 'info', 'warn');

-- CreateEnum
CREATE TYPE "FileBucket" AS ENUM ('private', 'public');

-- CreateEnum
CREATE TYPE "ImageUploadStatus" AS ENUM ('pending', 'processing', 'uploaded', 'failed');

-- CreateEnum
CREATE TYPE "ImageVariantType" AS ENUM ('original', 'thumbnail', 'small', 'medium', 'large');

-- CreateEnum
CREATE TYPE "AudioFormat" AS ENUM ('mp3', 'wav', 'aac', 'flac', 'ogg', 'opus');

-- CreateEnum
CREATE TYPE "AudioQuality" AS ENUM ('original', 'high', 'standard', 'low');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('pending', 'processing', 'complete', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "birthDate" TEXT,
    "gender" "Gender",
    "description" TEXT,
    "password" TEXT NOT NULL,
    "avatarId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_addresses" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "type" "EmailType" NOT NULL DEFAULT 'primary',
    "status" "EmailStatus" NOT NULL DEFAULT 'pending',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "email_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "SessionType" NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "refreshedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "accessTokenId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "refreshTokenId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "access_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "libraries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "libraries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_favorites" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "libraryId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "library_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_pins" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "libraryId" TEXT NOT NULL,
    "artistId" TEXT,
    "albumId" TEXT,
    "trackId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "library_pins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_artists" (
    "id" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "library_artists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_albums" (
    "id" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "library_albums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_tracks" (
    "id" TEXT NOT NULL,
    "listenedCount" INTEGER NOT NULL DEFAULT 0,
    "libraryId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "listenCountResetAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "library_tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artist_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "artistId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "artist_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artists" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isCommunity" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "bannerId" TEXT,
    "avatarId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "artists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "albums" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "AlbumType" NOT NULL DEFAULT 'album',
    "totalTracks" INTEGER NOT NULL DEFAULT 0,
    "totalDuration" INTEGER NOT NULL DEFAULT 0,
    "releaseDate" TIMESTAMP(3),
    "coverId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "albums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "trackNumber" INTEGER NOT NULL DEFAULT 0,
    "diskNumber" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "listenedCount" INTEGER NOT NULL DEFAULT 0,
    "explicit" BOOLEAN NOT NULL DEFAULT false,
    "lyrics" TEXT,
    "albumId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genres" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artist_genres" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artist_genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "album_genres" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "album_genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "track_genres" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "track_genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artist_follows" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artist_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listen_history" (
    "id" TEXT NOT NULL,
    "listenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listen_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_history" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "searchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "track_credits" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "CreditRole" NOT NULL,
    "trackId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "track_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'default',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "coverId" TEXT,
    "avatarId" TEXT,
    "userId" TEXT NOT NULL,
    "artistId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "community_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_comments" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "profileId" TEXT NOT NULL,
    "trackId" TEXT,
    "albumId" TEXT,
    "parentId" TEXT,
    "attachedImageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "community_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_comment_reactions" (
    "id" TEXT NOT NULL,
    "reaction" "CommunityReactionType" NOT NULL,
    "commentId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "community_comment_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playlists" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isCollaborative" BOOLEAN NOT NULL DEFAULT false,
    "libraryId" TEXT,
    "artistId" TEXT,
    "coverId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "playlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playlist_tracks" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "playlistId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "playlist_tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'created',
    "userId" TEXT NOT NULL,
    "targetId" TEXT,
    "assignedModeratorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_targets" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "communityProfileId" TEXT,
    "communityCommentId" TEXT,
    "artistId" TEXT,
    "albumId" TEXT,
    "trackId" TEXT,
    "playlistId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "report_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderator_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "moderator_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "images" (
    "id" TEXT NOT NULL,
    "alt" TEXT,
    "bucket" "FileBucket" NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT,
    "mimeType" TEXT NOT NULL,
    "blurhash" TEXT,
    "reportId" TEXT,
    "uploadStatus" "ImageUploadStatus" NOT NULL DEFAULT 'uploaded',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_variants" (
    "id" TEXT NOT NULL,
    "type" "ImageVariantType" NOT NULL DEFAULT 'original',
    "bucket" "FileBucket" NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "size" INTEGER NOT NULL,
    "imageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "image_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_files" (
    "id" TEXT NOT NULL,
    "bucket" "FileBucket" NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "format" "AudioFormat" NOT NULL,
    "duration" DOUBLE PRECISION,
    "bitrate" INTEGER,
    "sampleRate" INTEGER,
    "channels" INTEGER,
    "waveformJson" TEXT,
    "trackId" TEXT NOT NULL,
    "quality" "AudioQuality" NOT NULL DEFAULT 'original',
    "status" "ProcessingStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audio_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ImportedPlaylistLibrary" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ImportedPlaylistLibrary_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_TrackArtists" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TrackArtists_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AlbumArtists" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AlbumArtists_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_avatarId_key" ON "users"("avatarId");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "email_addresses_email_key" ON "email_addresses"("email");

-- CreateIndex
CREATE INDEX "email_addresses_userId_idx" ON "email_addresses"("userId");

-- CreateIndex
CREATE INDEX "email_addresses_status_idx" ON "email_addresses"("status");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_accessTokenId_key" ON "refresh_tokens"("accessTokenId");

-- CreateIndex
CREATE INDEX "refresh_tokens_sessionId_idx" ON "refresh_tokens"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "access_tokens_token_key" ON "access_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "access_tokens_refreshTokenId_key" ON "access_tokens"("refreshTokenId");

-- CreateIndex
CREATE UNIQUE INDEX "libraries_userId_key" ON "libraries"("userId");

-- CreateIndex
CREATE INDEX "libraries_createdAt_idx" ON "libraries"("createdAt");

-- CreateIndex
CREATE INDEX "library_favorites_libraryId_idx" ON "library_favorites"("libraryId");

-- CreateIndex
CREATE INDEX "library_favorites_trackId_idx" ON "library_favorites"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "library_favorites_libraryId_trackId_key" ON "library_favorites"("libraryId", "trackId");

-- CreateIndex
CREATE INDEX "library_pins_libraryId_idx" ON "library_pins"("libraryId");

-- CreateIndex
CREATE UNIQUE INDEX "library_pins_libraryId_artistId_key" ON "library_pins"("libraryId", "artistId");

-- CreateIndex
CREATE UNIQUE INDEX "library_pins_libraryId_albumId_key" ON "library_pins"("libraryId", "albumId");

-- CreateIndex
CREATE UNIQUE INDEX "library_pins_libraryId_trackId_key" ON "library_pins"("libraryId", "trackId");

-- CreateIndex
CREATE INDEX "library_artists_libraryId_idx" ON "library_artists"("libraryId");

-- CreateIndex
CREATE INDEX "library_artists_artistId_idx" ON "library_artists"("artistId");

-- CreateIndex
CREATE UNIQUE INDEX "library_artists_libraryId_artistId_key" ON "library_artists"("libraryId", "artistId");

-- CreateIndex
CREATE INDEX "library_albums_libraryId_idx" ON "library_albums"("libraryId");

-- CreateIndex
CREATE INDEX "library_albums_albumId_idx" ON "library_albums"("albumId");

-- CreateIndex
CREATE UNIQUE INDEX "library_albums_libraryId_albumId_key" ON "library_albums"("libraryId", "albumId");

-- CreateIndex
CREATE INDEX "library_tracks_libraryId_idx" ON "library_tracks"("libraryId");

-- CreateIndex
CREATE INDEX "library_tracks_trackId_idx" ON "library_tracks"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "library_tracks_libraryId_trackId_key" ON "library_tracks"("libraryId", "trackId");

-- CreateIndex
CREATE UNIQUE INDEX "artist_profiles_userId_key" ON "artist_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "artist_profiles_artistId_key" ON "artist_profiles"("artistId");

-- CreateIndex
CREATE INDEX "artist_profiles_userId_idx" ON "artist_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "artists_bannerId_key" ON "artists"("bannerId");

-- CreateIndex
CREATE UNIQUE INDEX "artists_avatarId_key" ON "artists"("avatarId");

-- CreateIndex
CREATE INDEX "artists_deletedAt_idx" ON "artists"("deletedAt");

-- CreateIndex
CREATE INDEX "artists_name_idx" ON "artists"("name");

-- CreateIndex
CREATE UNIQUE INDEX "albums_coverId_key" ON "albums"("coverId");

-- CreateIndex
CREATE INDEX "albums_deletedAt_idx" ON "albums"("deletedAt");

-- CreateIndex
CREATE INDEX "albums_name_idx" ON "albums"("name");

-- CreateIndex
CREATE INDEX "albums_type_idx" ON "albums"("type");

-- CreateIndex
CREATE INDEX "tracks_albumId_idx" ON "tracks"("albumId");

-- CreateIndex
CREATE INDEX "tracks_deletedAt_idx" ON "tracks"("deletedAt");

-- CreateIndex
CREATE INDEX "tracks_title_idx" ON "tracks"("title");

-- CreateIndex
CREATE UNIQUE INDEX "genres_name_key" ON "genres"("name");

-- CreateIndex
CREATE UNIQUE INDEX "genres_slug_key" ON "genres"("slug");

-- CreateIndex
CREATE INDEX "genres_name_idx" ON "genres"("name");

-- CreateIndex
CREATE INDEX "artist_genres_artistId_idx" ON "artist_genres"("artistId");

-- CreateIndex
CREATE INDEX "artist_genres_genreId_idx" ON "artist_genres"("genreId");

-- CreateIndex
CREATE UNIQUE INDEX "artist_genres_artistId_genreId_key" ON "artist_genres"("artistId", "genreId");

-- CreateIndex
CREATE INDEX "album_genres_albumId_idx" ON "album_genres"("albumId");

-- CreateIndex
CREATE INDEX "album_genres_genreId_idx" ON "album_genres"("genreId");

-- CreateIndex
CREATE UNIQUE INDEX "album_genres_albumId_genreId_key" ON "album_genres"("albumId", "genreId");

-- CreateIndex
CREATE INDEX "track_genres_trackId_idx" ON "track_genres"("trackId");

-- CreateIndex
CREATE INDEX "track_genres_genreId_idx" ON "track_genres"("genreId");

-- CreateIndex
CREATE UNIQUE INDEX "track_genres_trackId_genreId_key" ON "track_genres"("trackId", "genreId");

-- CreateIndex
CREATE INDEX "artist_follows_profileId_idx" ON "artist_follows"("profileId");

-- CreateIndex
CREATE INDEX "artist_follows_artistId_idx" ON "artist_follows"("artistId");

-- CreateIndex
CREATE UNIQUE INDEX "artist_follows_profileId_artistId_key" ON "artist_follows"("profileId", "artistId");

-- CreateIndex
CREATE INDEX "listen_history_userId_idx" ON "listen_history"("userId");

-- CreateIndex
CREATE INDEX "listen_history_trackId_idx" ON "listen_history"("trackId");

-- CreateIndex
CREATE INDEX "listen_history_listenedAt_idx" ON "listen_history"("listenedAt");

-- CreateIndex
CREATE INDEX "search_history_userId_idx" ON "search_history"("userId");

-- CreateIndex
CREATE INDEX "search_history_searchedAt_idx" ON "search_history"("searchedAt");

-- CreateIndex
CREATE INDEX "track_credits_trackId_idx" ON "track_credits"("trackId");

-- CreateIndex
CREATE INDEX "track_credits_role_idx" ON "track_credits"("role");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "community_profiles_coverId_key" ON "community_profiles"("coverId");

-- CreateIndex
CREATE UNIQUE INDEX "community_profiles_avatarId_key" ON "community_profiles"("avatarId");

-- CreateIndex
CREATE UNIQUE INDEX "community_profiles_userId_key" ON "community_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "community_profiles_artistId_key" ON "community_profiles"("artistId");

-- CreateIndex
CREATE INDEX "community_profiles_userId_idx" ON "community_profiles"("userId");

-- CreateIndex
CREATE INDEX "community_profiles_deletedAt_idx" ON "community_profiles"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "community_comments_attachedImageId_key" ON "community_comments"("attachedImageId");

-- CreateIndex
CREATE INDEX "community_comments_profileId_idx" ON "community_comments"("profileId");

-- CreateIndex
CREATE INDEX "community_comments_trackId_idx" ON "community_comments"("trackId");

-- CreateIndex
CREATE INDEX "community_comments_albumId_idx" ON "community_comments"("albumId");

-- CreateIndex
CREATE INDEX "community_comments_parentId_idx" ON "community_comments"("parentId");

-- CreateIndex
CREATE INDEX "community_comments_deletedAt_idx" ON "community_comments"("deletedAt");

-- CreateIndex
CREATE INDEX "community_comment_reactions_commentId_idx" ON "community_comment_reactions"("commentId");

-- CreateIndex
CREATE INDEX "community_comment_reactions_profileId_idx" ON "community_comment_reactions"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "community_comment_reactions_commentId_profileId_key" ON "community_comment_reactions"("commentId", "profileId");

-- CreateIndex
CREATE UNIQUE INDEX "playlists_coverId_key" ON "playlists"("coverId");

-- CreateIndex
CREATE INDEX "playlists_libraryId_idx" ON "playlists"("libraryId");

-- CreateIndex
CREATE INDEX "playlists_artistId_idx" ON "playlists"("artistId");

-- CreateIndex
CREATE INDEX "playlists_deletedAt_idx" ON "playlists"("deletedAt");

-- CreateIndex
CREATE INDEX "playlists_isPublic_idx" ON "playlists"("isPublic");

-- CreateIndex
CREATE INDEX "playlist_tracks_playlistId_idx" ON "playlist_tracks"("playlistId");

-- CreateIndex
CREATE INDEX "playlist_tracks_trackId_idx" ON "playlist_tracks"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "playlist_tracks_playlistId_trackId_key" ON "playlist_tracks"("playlistId", "trackId");

-- CreateIndex
CREATE UNIQUE INDEX "reports_targetId_key" ON "reports"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "reports_assignedModeratorId_key" ON "reports"("assignedModeratorId");

-- CreateIndex
CREATE INDEX "reports_userId_idx" ON "reports"("userId");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_deletedAt_idx" ON "reports"("deletedAt");

-- CreateIndex
CREATE INDEX "report_targets_userId_idx" ON "report_targets"("userId");

-- CreateIndex
CREATE INDEX "report_targets_artistId_idx" ON "report_targets"("artistId");

-- CreateIndex
CREATE INDEX "report_targets_albumId_idx" ON "report_targets"("albumId");

-- CreateIndex
CREATE INDEX "report_targets_trackId_idx" ON "report_targets"("trackId");

-- CreateIndex
CREATE INDEX "report_targets_playlistId_idx" ON "report_targets"("playlistId");

-- CreateIndex
CREATE UNIQUE INDEX "moderator_accounts_userId_key" ON "moderator_accounts"("userId");

-- CreateIndex
CREATE INDEX "moderator_accounts_userId_idx" ON "moderator_accounts"("userId");

-- CreateIndex
CREATE INDEX "images_key_idx" ON "images"("key");

-- CreateIndex
CREATE INDEX "images_reportId_idx" ON "images"("reportId");

-- CreateIndex
CREATE INDEX "image_variants_imageId_idx" ON "image_variants"("imageId");

-- CreateIndex
CREATE INDEX "image_variants_key_idx" ON "image_variants"("key");

-- CreateIndex
CREATE INDEX "audio_files_trackId_idx" ON "audio_files"("trackId");

-- CreateIndex
CREATE INDEX "audio_files_status_idx" ON "audio_files"("status");

-- CreateIndex
CREATE INDEX "_ImportedPlaylistLibrary_B_index" ON "_ImportedPlaylistLibrary"("B");

-- CreateIndex
CREATE INDEX "_TrackArtists_B_index" ON "_TrackArtists"("B");

-- CreateIndex
CREATE INDEX "_AlbumArtists_B_index" ON "_AlbumArtists"("B");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_addresses" ADD CONSTRAINT "email_addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_accessTokenId_fkey" FOREIGN KEY ("accessTokenId") REFERENCES "access_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "libraries" ADD CONSTRAINT "libraries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_favorites" ADD CONSTRAINT "library_favorites_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_favorites" ADD CONSTRAINT "library_favorites_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_pins" ADD CONSTRAINT "library_pins_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_pins" ADD CONSTRAINT "library_pins_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_pins" ADD CONSTRAINT "library_pins_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_pins" ADD CONSTRAINT "library_pins_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_artists" ADD CONSTRAINT "library_artists_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_artists" ADD CONSTRAINT "library_artists_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_albums" ADD CONSTRAINT "library_albums_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_albums" ADD CONSTRAINT "library_albums_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_tracks" ADD CONSTRAINT "library_tracks_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_tracks" ADD CONSTRAINT "library_tracks_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_profiles" ADD CONSTRAINT "artist_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_profiles" ADD CONSTRAINT "artist_profiles_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artists" ADD CONSTRAINT "artists_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artists" ADD CONSTRAINT "artists_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "albums" ADD CONSTRAINT "albums_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_genres" ADD CONSTRAINT "artist_genres_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_genres" ADD CONSTRAINT "artist_genres_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_genres" ADD CONSTRAINT "album_genres_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_genres" ADD CONSTRAINT "album_genres_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_genres" ADD CONSTRAINT "track_genres_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_genres" ADD CONSTRAINT "track_genres_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_follows" ADD CONSTRAINT "artist_follows_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "community_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_follows" ADD CONSTRAINT "artist_follows_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listen_history" ADD CONSTRAINT "listen_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listen_history" ADD CONSTRAINT "listen_history_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_credits" ADD CONSTRAINT "track_credits_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_profiles" ADD CONSTRAINT "community_profiles_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_profiles" ADD CONSTRAINT "community_profiles_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_profiles" ADD CONSTRAINT "community_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_profiles" ADD CONSTRAINT "community_profiles_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "community_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "community_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_attachedImageId_fkey" FOREIGN KEY ("attachedImageId") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comment_reactions" ADD CONSTRAINT "community_comment_reactions_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "community_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comment_reactions" ADD CONSTRAINT "community_comment_reactions_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "community_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlist_tracks" ADD CONSTRAINT "playlist_tracks_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlist_tracks" ADD CONSTRAINT "playlist_tracks_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "report_targets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_assignedModeratorId_fkey" FOREIGN KEY ("assignedModeratorId") REFERENCES "moderator_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_targets" ADD CONSTRAINT "report_targets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_targets" ADD CONSTRAINT "report_targets_communityProfileId_fkey" FOREIGN KEY ("communityProfileId") REFERENCES "community_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_targets" ADD CONSTRAINT "report_targets_communityCommentId_fkey" FOREIGN KEY ("communityCommentId") REFERENCES "community_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_targets" ADD CONSTRAINT "report_targets_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_targets" ADD CONSTRAINT "report_targets_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "albums"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_targets" ADD CONSTRAINT "report_targets_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_targets" ADD CONSTRAINT "report_targets_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "playlists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderator_accounts" ADD CONSTRAINT "moderator_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_variants" ADD CONSTRAINT "image_variants_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_files" ADD CONSTRAINT "audio_files_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ImportedPlaylistLibrary" ADD CONSTRAINT "_ImportedPlaylistLibrary_A_fkey" FOREIGN KEY ("A") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ImportedPlaylistLibrary" ADD CONSTRAINT "_ImportedPlaylistLibrary_B_fkey" FOREIGN KEY ("B") REFERENCES "playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TrackArtists" ADD CONSTRAINT "_TrackArtists_A_fkey" FOREIGN KEY ("A") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TrackArtists" ADD CONSTRAINT "_TrackArtists_B_fkey" FOREIGN KEY ("B") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AlbumArtists" ADD CONSTRAINT "_AlbumArtists_A_fkey" FOREIGN KEY ("A") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AlbumArtists" ADD CONSTRAINT "_AlbumArtists_B_fkey" FOREIGN KEY ("B") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
