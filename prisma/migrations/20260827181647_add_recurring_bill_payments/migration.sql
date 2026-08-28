-- CreateTable
CREATE TABLE "RecurringBillPayment" (
    "id" TEXT NOT NULL,
    "recurringBillId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringBillPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecurringBillPayment_transactionId_key" ON "RecurringBillPayment"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringBillPayment_recurringBillId_year_month_key" ON "RecurringBillPayment"("recurringBillId", "year", "month");

-- AddForeignKey
ALTER TABLE "RecurringBillPayment" ADD CONSTRAINT "RecurringBillPayment_recurringBillId_fkey" FOREIGN KEY ("recurringBillId") REFERENCES "RecurringBill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringBillPayment" ADD CONSTRAINT "RecurringBillPayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
