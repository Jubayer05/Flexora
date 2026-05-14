-- AlterTable: add affiliate/referral fields to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referralEarnings" DECIMAL(15,2) NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referredById" INTEGER;

-- Unique constraint on referralCode
CREATE UNIQUE INDEX IF NOT EXISTS "users_referralCode_key" ON "users"("referralCode");

-- Index for referral lookups
CREATE INDEX IF NOT EXISTS "users_referralCode_idx" ON "users"("referralCode");
CREATE INDEX IF NOT EXISTS "users_referredById_idx" ON "users"("referredById");

-- Foreign key (optional - add if your FK constraints are used)
-- ALTER TABLE "users" ADD CONSTRAINT "users_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
