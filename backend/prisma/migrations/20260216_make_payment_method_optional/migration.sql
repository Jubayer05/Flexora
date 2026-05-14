-- DropForeignKey (safe, just removes the constraint)
ALTER TABLE "payments" DROP CONSTRAINT "payments_paymentMethodId_fkey";

-- AlterTable (makes column nullable - NO DATA LOSS)
ALTER TABLE "payments" ALTER COLUMN "paymentMethodId" DROP NOT NULL;

-- AddForeignKey (recreates the constraint as optional)
ALTER TABLE "payments" ADD CONSTRAINT "payments_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
