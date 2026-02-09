-- CreateTable
CREATE TABLE "user_private_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "user_private_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "private_artist_profiles" (
    "id" TEXT NOT NULL,
    "userPrivateProfileId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "private_artist_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_private_profiles_userId_key" ON "user_private_profiles"("userId");

-- CreateIndex
CREATE INDEX "user_private_profiles_userId_idx" ON "user_private_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "private_artist_profiles_artistId_key" ON "private_artist_profiles"("artistId");

-- CreateIndex
CREATE INDEX "private_artist_profiles_userPrivateProfileId_idx" ON "private_artist_profiles"("userPrivateProfileId");

-- CreateIndex
CREATE INDEX "private_artist_profiles_artistId_idx" ON "private_artist_profiles"("artistId");

-- CreateIndex
CREATE UNIQUE INDEX "private_artist_profiles_userPrivateProfileId_artistId_key" ON "private_artist_profiles"("userPrivateProfileId", "artistId");

-- AddForeignKey
ALTER TABLE "user_private_profiles" ADD CONSTRAINT "user_private_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_artist_profiles" ADD CONSTRAINT "private_artist_profiles_userPrivateProfileId_fkey" FOREIGN KEY ("userPrivateProfileId") REFERENCES "user_private_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_artist_profiles" ADD CONSTRAINT "private_artist_profiles_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
