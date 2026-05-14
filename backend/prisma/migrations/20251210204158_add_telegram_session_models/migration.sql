-- CreateTable
CREATE TABLE "telegram_sessions" (
    "id" SERIAL NOT NULL,
    "phone_number" TEXT NOT NULL,
    "session_string" TEXT NOT NULL,
    "is_authorized" BOOLEAN NOT NULL DEFAULT false,
    "user_id" BIGINT,
    "username" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_otp_requests" (
    "id" SERIAL NOT NULL,
    "phone_number" TEXT NOT NULL,
    "phone_code_hash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requires_2fa" BOOLEAN NOT NULL DEFAULT false,
    "customer_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_otp_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_sessions_phone_number_key" ON "telegram_sessions"("phone_number");

-- CreateIndex
CREATE INDEX "telegram_sessions_phone_number_idx" ON "telegram_sessions"("phone_number");

-- CreateIndex
CREATE INDEX "telegram_sessions_is_authorized_idx" ON "telegram_sessions"("is_authorized");

-- CreateIndex
CREATE INDEX "telegram_sessions_created_by_idx" ON "telegram_sessions"("created_by");

-- CreateIndex
CREATE INDEX "telegram_otp_requests_phone_number_idx" ON "telegram_otp_requests"("phone_number");

-- CreateIndex
CREATE INDEX "telegram_otp_requests_status_idx" ON "telegram_otp_requests"("status");

-- CreateIndex
CREATE INDEX "telegram_otp_requests_expires_at_idx" ON "telegram_otp_requests"("expires_at");
