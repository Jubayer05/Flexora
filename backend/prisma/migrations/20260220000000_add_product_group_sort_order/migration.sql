-- AlterTable
ALTER TABLE "product_groups" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "product_groups_sortOrder_idx" ON "product_groups"("sortOrder");
