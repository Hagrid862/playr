/*
  Warnings:

  - You are about to drop the column `durationMs` on the `listen_history` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "listen_history" DROP COLUMN "durationMs";
