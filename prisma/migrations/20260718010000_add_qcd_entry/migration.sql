-- CreateTable
CREATE TABLE "QcdEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "distributionDate" TIMESTAMP(3) NOT NULL,
    "charityName" TEXT,
    "taxYear" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QcdEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QcdEntry_userId_taxYear_idx" ON "QcdEntry"("userId", "taxYear");

-- AddForeignKey
ALTER TABLE "QcdEntry" ADD CONSTRAINT "QcdEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QcdEntry" ADD CONSTRAINT "QcdEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

