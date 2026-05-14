-- AlterTable: Add new fields to email_templates table
ALTER TABLE "email_templates" 
ADD COLUMN IF NOT EXISTS "htmlBody" TEXT,
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "description" TEXT,
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Make type unique (if not already)
CREATE UNIQUE INDEX IF NOT EXISTS "email_templates_type_key" ON "email_templates"("type");

-- Update existing records to have default values
UPDATE "email_templates" 
SET 
  "isActive" = true,
  "variables" = ARRAY[]::TEXT[],
  "createdAt" = COALESCE("createdAt", CURRENT_TIMESTAMP),
  "updatedAt" = COALESCE("updatedAt", CURRENT_TIMESTAMP)
WHERE "isActive" IS NULL OR "variables" IS NULL;

