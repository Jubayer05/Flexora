-- Apply ONLY the new auth tables (safe to run on DB that already has carts/slugs).
-- Run this in Neon SQL Editor or: psql $DATABASE_URL -f apply_auth_tables_only.sql
-- Then run: bunx prisma migrate resolve --applied 20260204135039_add_auth_tokens_and_social_providers

-- CreateTable
CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user_auth_providers" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "email" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_auth_providers_pkey" PRIMARY KEY ("id")
);

-- Indexes (IF NOT EXISTS supported in PostgreSQL 9.5+)
CREATE INDEX IF NOT EXISTS "email_verification_tokens_userId_idx" ON "email_verification_tokens"("userId");
CREATE INDEX IF NOT EXISTS "email_verification_tokens_tokenHash_idx" ON "email_verification_tokens"("tokenHash");

CREATE INDEX IF NOT EXISTS "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_tokenHash_idx" ON "password_reset_tokens"("tokenHash");

CREATE INDEX IF NOT EXISTS "user_auth_providers_userId_idx" ON "user_auth_providers"("userId");
CREATE INDEX IF NOT EXISTS "user_auth_providers_provider_email_idx" ON "user_auth_providers"("provider", "email");
CREATE UNIQUE INDEX IF NOT EXISTS "user_auth_providers_provider_providerUserId_key" ON "user_auth_providers"("provider", "providerUserId");

-- Foreign keys (only add if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_verification_tokens_userId_fkey') THEN
    ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'password_reset_tokens_userId_fkey') THEN
    ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_auth_providers_userId_fkey') THEN
    ALTER TABLE "user_auth_providers" ADD CONSTRAINT "user_auth_providers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
