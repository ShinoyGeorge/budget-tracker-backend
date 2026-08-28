/*
  Warnings:

  - You are about to drop the column `ownerId` on the `Account` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_ownerId_fkey";

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "ownerId";
