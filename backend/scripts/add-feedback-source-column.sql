-- Add feedback.source column if missing (idempotent)
-- Run when backend is stopped to avoid advisory lock conflicts
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FeedbackSource') THEN
    CREATE TYPE "FeedbackSource" AS ENUM ('CUSTOMER', 'MANUAL', 'BULK_GENERATED');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'feedback' AND column_name = 'source'
  ) THEN
    ALTER TABLE "feedback" ADD COLUMN "source" "FeedbackSource" NOT NULL DEFAULT 'CUSTOMER';
    CREATE INDEX IF NOT EXISTS "feedback_source_idx" ON "feedback"("source");
  END IF;
END $$;
