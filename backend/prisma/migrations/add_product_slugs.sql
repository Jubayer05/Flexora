-- Migration: Add slug columns to products and product_groups tables
-- Run this migration when database connection is available

-- Step 1: Add slug column to products table (nullable first)
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "slug" TEXT;

-- Step 2: Add slug column to product_groups table (nullable first)
ALTER TABLE "product_groups" ADD COLUMN IF NOT EXISTS "slug" TEXT;

-- Step 3: Generate slugs for existing products
-- This function converts a name to a URL-friendly slug
DO $$
DECLARE
    product_record RECORD;
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER;
BEGIN
    FOR product_record IN SELECT id, name FROM "products" WHERE slug IS NULL OR slug = '' LOOP
        -- Generate base slug from name
        base_slug := LOWER(REGEXP_REPLACE(REGEXP_REPLACE(product_record.name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
        base_slug := TRIM(BOTH '-' FROM base_slug);
        
        -- Ensure slug is not empty
        IF base_slug = '' THEN
            base_slug := 'product-' || product_record.id;
        END IF;
        
        -- Check if slug already exists and make it unique
        final_slug := base_slug;
        counter := 1;
        
        WHILE EXISTS (SELECT 1 FROM "products" WHERE slug = final_slug AND id != product_record.id) LOOP
            final_slug := base_slug || '-' || counter;
            counter := counter + 1;
        END LOOP;
        
        -- Update the product with the generated slug
        UPDATE "products" SET slug = final_slug WHERE id = product_record.id;
    END LOOP;
END $$;

-- Step 4: Generate slugs for existing product groups
DO $$
DECLARE
    group_record RECORD;
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER;
BEGIN
    FOR group_record IN SELECT id, name FROM "product_groups" WHERE slug IS NULL OR slug = '' LOOP
        -- Generate base slug from name
        base_slug := LOWER(REGEXP_REPLACE(REGEXP_REPLACE(group_record.name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
        base_slug := TRIM(BOTH '-' FROM base_slug);
        
        -- Ensure slug is not empty
        IF base_slug = '' THEN
            base_slug := 'group-' || group_record.id;
        END IF;
        
        -- Check if slug already exists and make it unique
        final_slug := base_slug;
        counter := 1;
        
        WHILE EXISTS (SELECT 1 FROM "product_groups" WHERE slug = final_slug AND id != group_record.id) LOOP
            final_slug := base_slug || '-' || counter;
            counter := counter + 1;
        END LOOP;
        
        -- Update the product group with the generated slug
        UPDATE "product_groups" SET slug = final_slug WHERE id = group_record.id;
    END LOOP;
END $$;

-- Step 5: Make slug columns NOT NULL and add unique constraints
ALTER TABLE "products" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "product_groups" ALTER COLUMN "slug" SET NOT NULL;

-- Step 6: Add unique constraints
ALTER TABLE "products" ADD CONSTRAINT "products_slug_key" UNIQUE ("slug");
ALTER TABLE "product_groups" ADD CONSTRAINT "product_groups_slug_key" UNIQUE ("slug");

-- Step 7: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "products_slug_idx" ON "products"("slug");
CREATE INDEX IF NOT EXISTS "product_groups_slug_idx" ON "product_groups"("slug");














