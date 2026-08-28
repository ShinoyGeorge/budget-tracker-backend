/*
  Warnings:

  - You are about to drop the column `ownerId` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `ownerId` on the `Category` table. All the data in the column will be lost.
  - Added the required column `householdId` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Added the required column `householdId` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_ownerId_fkey";

-- DropIndex
DROP INDEX "Account_ownerId_idx";

-- DropIndex
DROP INDEX "Category_ownerId_idx";

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "ownerId",
ADD COLUMN     "householdId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "ownerId",
ADD COLUMN     "householdId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "householdId" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdCreationRequest" (
    "id" TEXT NOT NULL,
    "householdName" TEXT NOT NULL,
    "founderName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HouseholdCreationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdJoinRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HouseholdJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdCreationRequest_email_key" ON "HouseholdCreationRequest"("email");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdJoinRequest_email_key" ON "HouseholdJoinRequest"("email");

-- CreateIndex
CREATE INDEX "HouseholdJoinRequest_householdId_idx" ON "HouseholdJoinRequest"("householdId");

-- CreateIndex
CREATE INDEX "Account_householdId_idx" ON "Account"("householdId");

-- CreateIndex
CREATE INDEX "Category_householdId_idx" ON "Category"("householdId");

-- CreateIndex
CREATE INDEX "User_householdId_idx" ON "User"("householdId");

-- AddForeignKey
ALTER TABLE "HouseholdJoinRequest" ADD CONSTRAINT "HouseholdJoinRequest_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;
