-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'SEPARATED');

-- CreateEnum
CREATE TYPE "FamilyRelationship" AS ENUM ('SPOUSE', 'FORMER_SPOUSE', 'CHILD', 'DEPENDENT', 'PARENT', 'SIBLING', 'OTHER');

-- CreateEnum
CREATE TYPE "LifeEventType" AS ENUM ('MARRIAGE', 'DIVORCE', 'DEATH_OF_RELATIVE', 'INHERITANCE', 'BIRTH', 'OTHER');

-- CreateEnum
CREATE TYPE "AccountSource" AS ENUM ('PLAID', 'MANUAL');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('TRADITIONAL_IRA', 'ROTH_IRA', 'INHERITED_IRA', 'PLAN_401K', 'PLAN_403B', 'HSA', 'LIFE_INSURANCE', 'ANNUITY', 'BROKERAGE', 'BANK_CHECKING', 'BANK_SAVINGS', 'OTHER');

-- CreateEnum
CREATE TYPE "BeneficiaryRelationship" AS ENUM ('SPOUSE', 'FORMER_SPOUSE', 'CHILD', 'GRANDCHILD', 'PARENT', 'SIBLING', 'TRUST', 'ESTATE', 'CHARITY', 'OTHER', 'NONE');

-- CreateEnum
CREATE TYPE "InheritedIraBeneficiaryClass" AS ENUM ('SPOUSE', 'MINOR_CHILD_OF_OWNER', 'DISABLED', 'CHRONICALLY_ILL', 'NOT_MORE_THAN_10_YEARS_YOUNGER', 'NON_ELIGIBLE', 'NON_PERSON');

-- CreateEnum
CREATE TYPE "RuleId" AS ENUM ('INHERITED_IRA_10YR', 'BENEFICIARY_MISMATCH');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "FlagStatus" AS ENUM ('OPEN', 'DISMISSED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT,
    "stateOfResidence" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "maritalStatus" "MaritalStatus" NOT NULL DEFAULT 'SINGLE',
    "currentSpouseName" TEXT,
    "dependentsCount" INTEGER NOT NULL DEFAULT 0,
    "nextReviewDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "relationship" "FamilyRelationship" NOT NULL,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "marriageDate" TIMESTAMP(3),
    "divorceDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LifeEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "LifeEventType" NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "relatedPersonName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LifeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "AccountSource" NOT NULL DEFAULT 'MANUAL',
    "plaidItemId" TEXT,
    "plaidAccountId" TEXT,
    "institutionName" TEXT,
    "accountType" "AccountType" NOT NULL DEFAULT 'OTHER',
    "nickname" TEXT NOT NULL,
    "balance" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "balanceAsOf" TIMESTAMP(3),
    "accountNumberEnc" TEXT,
    "beneficiaryPrimaryName" TEXT,
    "beneficiaryPrimaryRelationship" "BeneficiaryRelationship",
    "beneficiaryContingentName" TEXT,
    "beneficiaryLastConfirmed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InheritedIraDetail" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "originalOwnerName" TEXT,
    "originalOwnerDateOfBirth" TIMESTAMP(3),
    "originalOwnerDateOfDeath" TIMESTAMP(3) NOT NULL,
    "beneficiaryClass" "InheritedIraBeneficiaryClass" NOT NULL,
    "beneficiaryDateOfBirth" TIMESTAMP(3),
    "currentYearDistribution" DECIMAL(18,2),
    "priorYearEndBalance" DECIMAL(18,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InheritedIraDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaidItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "accessTokenEnc" TEXT NOT NULL,
    "institutionName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaidItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "ruleId" "RuleId" NOT NULL,
    "code" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "dataJson" JSONB,
    "status" "FlagStatus" NOT NULL DEFAULT 'OPEN',
    "dismissedReason" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InheritedIraDetail_accountId_key" ON "InheritedIraDetail"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaidItem_itemId_key" ON "PlaidItem"("itemId");

-- CreateIndex
CREATE INDEX "Flag_userId_status_idx" ON "Flag"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Flag_userId_dedupeKey_key" ON "Flag"("userId", "dedupeKey");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LifeEvent" ADD CONSTRAINT "LifeEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InheritedIraDetail" ADD CONSTRAINT "InheritedIraDetail_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

