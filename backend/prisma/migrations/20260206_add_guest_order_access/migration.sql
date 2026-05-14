-- CreateTable guest_order_access
CREATE TABLE "guest_order_access" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "guestEmail" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_order_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex on token (unique)
CREATE UNIQUE INDEX "guest_order_access_token_key" ON "guest_order_access"("token");

-- CreateIndex on token
CREATE INDEX "guest_order_access_token_idx" ON "guest_order_access"("token");

-- CreateIndex on orderId
CREATE INDEX "guest_order_access_orderId_idx" ON "guest_order_access"("orderId");

-- CreateIndex on guestEmail
CREATE INDEX "guest_order_access_guestEmail_idx" ON "guest_order_access"("guestEmail");

-- AddForeignKey
ALTER TABLE "guest_order_access" ADD CONSTRAINT "guest_order_access_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
