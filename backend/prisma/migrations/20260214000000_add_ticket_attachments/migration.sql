-- AlterTable
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[];
