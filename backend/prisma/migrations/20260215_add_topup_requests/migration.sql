-- CreateTable for TopupRequest
CREATE TABLE "topup_requests" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topup_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "topup_requests" ADD CONSTRAINT "topup_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "topup_requests_userId_idx" ON "topup_requests"("userId");
CREATE INDEX "topup_requests_status_idx" ON "topup_requests"("status");
CREATE INDEX "topup_requests_createdAt_idx" ON "topup_requests"("createdAt");
