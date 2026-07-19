-- CreateEnum
CREATE TYPE "EstateDocType" AS ENUM ('WILL', 'REVOCABLE_TRUST', 'IRREVOCABLE_TRUST', 'FINANCIAL_POA', 'HEALTHCARE_POA');

-- CreateEnum
CREATE TYPE "EducationAccountType" AS ENUM ('PLAN_529', 'COVERDELL');

-- CreateTable
CREATE TABLE "EstateDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "docType" "EstateDocType" NOT NULL,
    "exists" BOOLEAN NOT NULL DEFAULT false,
    "lastReviewed" TIMESTAMP(3),
    "attorneyName" TEXT,
    "attorneyContact" TEXT,
    "storageLocation" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstateDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetAmount" DECIMAL(18,2) NOT NULL,
    "targetDate" TIMESTAMP(3),
    "currentSaved" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItemState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checklistKey" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItemState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountType" "EducationAccountType" NOT NULL DEFAULT 'PLAN_529',
    "institutionName" TEXT,
    "beneficiaryName" TEXT,
    "balance" DECIMAL(18,2),
    "annualContribution" DECIMAL(18,2),
    "stateOfPlan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EducationAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EstateDocument_userId_docType_key" ON "EstateDocument"("userId", "docType");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistItemState_userId_checklistKey_itemKey_key" ON "ChecklistItemState"("userId", "checklistKey", "itemKey");

-- AddForeignKey
ALTER TABLE "EstateDocument" ADD CONSTRAINT "EstateDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItemState" ADD CONSTRAINT "ChecklistItemState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationAccount" ADD CONSTRAINT "EducationAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

