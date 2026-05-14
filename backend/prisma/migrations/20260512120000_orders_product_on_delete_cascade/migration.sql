-- Allow deleting products when orders reference them (orders removed by CASCADE).
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_productId_fkey";
ALTER TABLE "orders" ADD CONSTRAINT "orders_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
