/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `product_groups` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `products` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable (skipped - columns already exist in database)
-- ALTER TABLE "product_groups" ADD COLUMN     "seo" JSONB,
-- ADD COLUMN     "slug" TEXT;

-- AlterTable (skipped - column already exists in database)
-- ALTER TABLE "products" ADD COLUMN     "slug" TEXT;

-- CreateTable (skipped - table already exists in database)
-- CREATE TABLE "carts" (
--     "id" SERIAL NOT NULL,
--     "userId" INTEGER NOT NULL,
--     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     "updatedAt" TIMESTAMP(3) NOT NULL,
-- 
--     CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
-- );

-- CreateTable (skipped - table already exists in database)
-- CREATE TABLE "cart_items" (
--     "id" SERIAL NOT NULL,
--     "cartId" INTEGER NOT NULL,
--     "productId" INTEGER NOT NULL,
--     "quantity" INTEGER NOT NULL DEFAULT 1,
--     "unitPrice" DECIMAL(15,2) NOT NULL,
--     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     "updatedAt" TIMESTAMP(3) NOT NULL,
-- 
--     CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
-- );

-- CreateIndex (skipped - index already exists in database)
-- CREATE UNIQUE INDEX "carts_userId_key" ON "carts"("userId");

-- CreateIndex (skipped - index already exists in database)
-- CREATE INDEX "carts_userId_idx" ON "carts"("userId");

-- CreateIndex (skipped - index already exists in database)
-- CREATE INDEX "cart_items_cartId_idx" ON "cart_items"("cartId");

-- CreateIndex (skipped - index already exists in database)
-- CREATE INDEX "cart_items_productId_idx" ON "cart_items"("productId");

-- CreateIndex (skipped - index already exists in database)
-- CREATE UNIQUE INDEX "cart_items_cartId_productId_key" ON "cart_items"("cartId", "productId");

-- CreateIndex (skipped - index already exists in database)
-- CREATE UNIQUE INDEX "product_groups_slug_key" ON "product_groups"("slug");

-- CreateIndex (skipped - index already exists in database)
-- CREATE INDEX "product_groups_slug_idx" ON "product_groups"("slug");

-- CreateIndex (skipped - index already exists in database)
-- CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex (skipped - index already exists in database)
-- CREATE INDEX "products_slug_idx" ON "products"("slug");

-- AddForeignKey (skipped - foreign keys already exist in database)
-- ALTER TABLE "carts" ADD CONSTRAINT "carts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (skipped - foreign keys already exist in database)
-- ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (skipped - foreign keys already exist in database)
-- ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

