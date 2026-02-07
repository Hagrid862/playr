/*
  Warnings:

  - You are about to drop the column `accessTokenId` on the `refresh_tokens` table. All the data in the column will be lost.
  - You are about to drop the `access_tokens` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_accessTokenId_fkey";

-- DropIndex
DROP INDEX "refresh_tokens_accessTokenId_key";

-- AlterTable
ALTER TABLE "refresh_tokens" DROP COLUMN "accessTokenId";

-- DropTable
DROP TABLE "access_tokens";
