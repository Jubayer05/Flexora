-- Soft delete + partial unique indexes for catalog entities

ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "product_groups" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

DROP INDEX IF EXISTS "categories_name_key";
DROP INDEX IF EXISTS "categories_slug_key";
DROP INDEX IF EXISTS "products_sku_key";
DROP INDEX IF EXISTS "products_slug_key";
DROP INDEX IF EXISTS "products_privateUrl_key";
DROP INDEX IF EXISTS "product_groups_name_key";
DROP INDEX IF EXISTS "product_groups_slug_key";

CREATE UNIQUE INDEX "categories_name_active_key" ON "categories"("name") WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "categories_slug_active_key" ON "categories"("slug") WHERE "deletedAt" IS NULL;

CREATE UNIQUE INDEX "products_sku_active_key" ON "products"("sku") WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "products_slug_active_key" ON "products"("slug") WHERE "deletedAt" IS NULL AND "slug" IS NOT NULL;
CREATE UNIQUE INDEX "products_privateUrl_active_key" ON "products"("privateUrl") WHERE "deletedAt" IS NULL AND "privateUrl" IS NOT NULL;

CREATE UNIQUE INDEX "product_groups_name_active_key" ON "product_groups"("name") WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "product_groups_slug_active_key" ON "product_groups"("slug") WHERE "deletedAt" IS NULL AND "slug" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "categories_deletedAt_idx" ON "categories"("deletedAt");
CREATE INDEX IF NOT EXISTS "products_deletedAt_idx" ON "products"("deletedAt");
CREATE INDEX IF NOT EXISTS "product_groups_deletedAt_idx" ON "product_groups"("deletedAt");
