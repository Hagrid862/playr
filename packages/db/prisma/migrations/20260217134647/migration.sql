/*
  Warnings:

  - Added the required column `isOriginal` to the `audio_files` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "audio_files" ADD COLUMN     "isOriginal" BOOLEAN NOT NULL;
