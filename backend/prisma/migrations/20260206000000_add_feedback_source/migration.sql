-- CreateEnum
CREATE TYPE "FeedbackSource" AS ENUM ('CUSTOMER', 'MANUAL', 'BULK_GENERATED');

-- AlterTable
ALTER TABLE "feedback" ADD COLUMN "source" "FeedbackSource" NOT NULL DEFAULT 'CUSTOMER';

-- CreateIndex
CREATE INDEX "feedback_source_idx" ON "feedback"("source");
