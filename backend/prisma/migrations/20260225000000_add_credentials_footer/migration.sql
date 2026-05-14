-- AlterTable: Add credentialsFooter to delivery_templates
ALTER TABLE "delivery_templates" ADD COLUMN IF NOT EXISTS "credentialsFooter" TEXT;

-- Set default for existing rows
UPDATE "delivery_templates" SET "credentialsFooter" = '____ end of goods ____' WHERE "credentialsFooter" IS NULL;
