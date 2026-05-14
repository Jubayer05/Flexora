-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CUSTOMER', 'GUEST', 'MODERATOR');

-- CreateEnum
CREATE TYPE "NameStatus" AS ENUM ('AVAILABLE', 'USED');

-- CreateEnum
CREATE TYPE "UserRank" AS ENUM ('NEW', 'NORMAL', 'FREQUENT', 'ELITE', 'VIP', 'MASTER');

-- CreateEnum
CREATE TYPE "PlatformType" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'TWITTER', 'TELEGRAM', 'TIKTOK', 'YOUTUBE', 'OTHER');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PARTIAL', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'PARTIAL', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('ORDER', 'SUBSCRIPTION_PURCHASE', 'SUBSCRIPTION_RENEWAL');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "TelegramTransferStatus" AS ENUM ('PENDING', 'VERIFICATION_REQUIRED', 'CUSTOMER_JOINED', 'TRANSFER_IN_PROGRESS', 'WAITING_PERIOD', 'COMPLETING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ORDER', 'PAYMENT', 'RESTOCK', 'SYSTEM', 'PROMOTION', 'OTHERS');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "CouponStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED', 'DEPLETED');

-- CreateEnum
CREATE TYPE "CouponScope" AS ENUM ('ALL_PRODUCTS', 'SPECIFIC_PRODUCTS', 'SPECIFIC_CATEGORIES');

-- CreateEnum
CREATE TYPE "GalleryType" AS ENUM ('IMAGE', 'VIDEO', 'FILE');

-- CreateEnum
CREATE TYPE "BalanceTransactionType" AS ENUM ('DEPOSIT', 'DEDUCT', 'REFUND', 'BONUS', 'ADJUSTMENT', 'TOPUP', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "WithdrawStatus" AS ENUM ('PENDING', 'DONE');

-- CreateEnum
CREATE TYPE "PageType" AS ENUM ('EXTERNAL', 'DYNAMIC', 'HYBRID');

-- CreateEnum
CREATE TYPE "Location" AS ENUM ('HEADER', 'FOOTER');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "passwordHash" TEXT,
    "firstName" TEXT,
    "phone" TEXT,
    "telegramUsername" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "country" TEXT,
    "totalSpent" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "isGuest" BOOLEAN NOT NULL DEFAULT false,
    "guestToken" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "note" TEXT,
    "roleId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "emailVerifiedAt" TIMESTAMP(3),
    "meta" JSONB,
    "rankId" INTEGER,
    "subscriptionPackageId" INTEGER,
    "subscriptionStartDate" TIMESTAMP(3),
    "subscriptionEndDate" TIMESTAMP(3),
    "subscriptionNotified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ranks" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "minSpending" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "maxSpending" DECIMAL(10,2) NOT NULL DEFAULT 10000,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "bonusDevices" INTEGER NOT NULL DEFAULT 0,
    "meta" JSONB,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ranks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" SERIAL NOT NULL,
    "roleId" INTEGER NOT NULL,
    "resource" TEXT NOT NULL,
    "actions" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "parentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "meta" JSONB,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'FILE',
    "platform" "PlatformType",
    "telegramUrl" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "policy" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL(15,2) NOT NULL,
    "originalPrice" DECIMAL(15,2),
    "discount" DECIMAL(15,2),
    "btnText" TEXT,
    "costPrice" DECIMAL(15,2),
    "stockCount" INTEGER NOT NULL DEFAULT 0,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "minQuantity" INTEGER NOT NULL DEFAULT 1,
    "maxQuantity" INTEGER NOT NULL DEFAULT 1000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "privateUrl" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "thumbnail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "meta" JSONB,
    "seo" JSONB,
    "categoryId" INTEGER NOT NULL,
    "productGroupId" INTEGER,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_groups" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "meta" JSONB,

    CONSTRAINT "product_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "productId" INTEGER,
    "name" TEXT NOT NULL,
    "feedback" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "rating" DECIMAL(2,1) NOT NULL,
    "isScheduled" BOOLEAN NOT NULL DEFAULT false,
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FakeNames" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "status" "NameStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FakeNames_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "platform" "PlatformType" NOT NULL,
    "encryptedData" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "requiresOtp" BOOLEAN NOT NULL DEFAULT false,
    "hasPremium" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "usedByOrderId" INTEGER,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "meta" JSONB,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "type" "CouponType" NOT NULL,
    "status" "CouponStatus" NOT NULL DEFAULT 'ACTIVE',
    "scope" "CouponScope" NOT NULL DEFAULT 'SPECIFIC_PRODUCTS',
    "discountValue" DECIMAL(15,2) NOT NULL,
    "maxDiscountAmount" DECIMAL(15,2),
    "minOrderAmount" DECIMAL(15,2),
    "usageLimit" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "userUsageLimit" INTEGER,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "applicableProductIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "applicableCategoryIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "meta" JSONB,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_usage" (
    "id" SERIAL NOT NULL,
    "couponId" INTEGER NOT NULL,
    "orderId" INTEGER NOT NULL,
    "userId" INTEGER,
    "guestEmail" TEXT,
    "discountAmount" DECIMAL(15,2) NOT NULL,
    "orderAmount" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "thumbnail" TEXT,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "merchantId" TEXT,
    "webhookSecret" TEXT,
    "testMode" BOOLEAN NOT NULL DEFAULT false,
    "currencies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "networks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "bonusThreshold" DECIMAL(15,2) DEFAULT 0,
    "bonus" DECIMAL(5,2) DEFAULT 0,
    "feeType" "DiscountType",
    "feeValue" DECIMAL(5,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "meta" JSONB,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_packages" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" JSONB,
    "discount" DECIMAL(5,2) NOT NULL,
    "price" DECIMAL(15,2) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "meta" JSONB,

    CONSTRAINT "subscription_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_payments" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "subscriptionPackageId" INTEGER NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "paymentMethodId" INTEGER,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "gatewayTxnId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "meta" JSONB,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blogs" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "source" TEXT,
    "thumbnail" TEXT,
    "gallery" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "views" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "categoryId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "meta" JSONB,
    "seo" JSONB,

    CONSTRAINT "blogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery" (
    "id" SERIAL NOT NULL,
    "fileId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "GalleryType" NOT NULL DEFAULT 'IMAGE',

    CONSTRAINT "gallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "userId" INTEGER,
    "guestEmail" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "subtotal" DECIMAL(15,2) NOT NULL,
    "discount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL,
    "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "deliveredAt" TIMESTAMP(3),
    "quantityOrdered" INTEGER NOT NULL DEFAULT 0,
    "quantityDelivered" INTEGER NOT NULL DEFAULT 0,
    "quantityPending" INTEGER NOT NULL DEFAULT 0,
    "isPartial" BOOLEAN NOT NULL DEFAULT false,
    "canResend" BOOLEAN NOT NULL DEFAULT true,
    "canReplace" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "meta" JSONB,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER,
    "type" "PaymentType" NOT NULL DEFAULT 'ORDER',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(15,2) NOT NULL,
    "paidAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "refundedAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "gateway" TEXT NOT NULL,
    "gatewayTxnId" TEXT,
    "gatewayStatus" TEXT,
    "binanceOrderId" TEXT,
    "binanceStatus" TEXT,
    "paidAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "meta" JSONB,
    "paymentMethodId" INTEGER NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otps" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "email" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "accounts" JSONB NOT NULL,
    "fileUrl" TEXT,
    "format" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "downloadedAt" TIMESTAMP(3),
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "meta" JSONB,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_transfers" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "status" "TelegramTransferStatus" NOT NULL DEFAULT 'PENDING',
    "targetUrl" TEXT NOT NULL,
    "transferType" TEXT NOT NULL,
    "customerTelegram" TEXT NOT NULL,
    "joinVerified" BOOLEAN NOT NULL DEFAULT false,
    "joinVerifiedAt" TIMESTAMP(3),
    "transferStartedAt" TIMESTAMP(3),
    "transferCompletedAt" TIMESTAMP(3),
    "lastRetryAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "transferProofUrl" TEXT,
    "proofData" TEXT,
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "adminNotes" TEXT,
    "manualOverride" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "meta" JSONB,

    CONSTRAINT "telegram_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliates" (
    "id" SERIAL NOT NULL,
    "currency" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isPaid" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "meta" JSONB,

    CONSTRAINT "affiliates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" SERIAL NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "userId" INTEGER,
    "guestEmail" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "meta" JSONB,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_replies" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "isStaff" BOOLEAN NOT NULL DEFAULT false,
    "authorId" INTEGER,
    "authorName" TEXT,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "meta" JSONB,

    CONSTRAINT "ticket_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "type" "NotificationType" NOT NULL DEFAULT 'OTHERS',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_read_status" (
    "id" SERIAL NOT NULL,
    "notificationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_read_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_telegram_data" (
    "id" SERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "chatId" BIGINT NOT NULL,
    "username" TEXT,
    "phoneNumber" TEXT,
    "firstName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_telegram_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_pages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT,
    "type" "PageType" NOT NULL DEFAULT 'DYNAMIC',
    "location" "Location" NOT NULL DEFAULT 'HEADER',
    "group" TEXT,
    "url" TEXT,
    "subtitle" TEXT,
    "excerpt" TEXT,
    "description" TEXT,
    "banner" TEXT,
    "thumbnail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "seo" JSONB,
    "content" JSONB,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_sessions" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "meta" JSONB,

    CONSTRAINT "login_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balance_transactions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "BalanceTransactionType" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "balanceBefore" DECIMAL(15,2) NOT NULL,
    "balanceAfter" DECIMAL(15,2) NOT NULL,
    "reference" TEXT,
    "description" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB,

    CONSTRAINT "balance_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "method" TEXT NOT NULL,
    "status" "WithdrawStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB,

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitors" (
    "date" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitors_pkey" PRIMARY KEY ("date")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_guestToken_key" ON "users"("guestToken");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_country_idx" ON "users"("country");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_guestToken_idx" ON "users"("guestToken");

-- CreateIndex
CREATE INDEX "users_rankId_totalSpent_idx" ON "users"("rankId", "totalSpent");

-- CreateIndex
CREATE INDEX "users_isActive_isBanned_idx" ON "users"("isActive", "isBanned");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ranks_name_key" ON "ranks"("name");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_resource_key" ON "role_permissions"("roleId", "resource");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_slug_idx" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");

-- CreateIndex
CREATE INDEX "categories_isActive_sortOrder_idx" ON "categories"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "categories_parentId_isActive_sortOrder_idx" ON "categories"("parentId", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_privateUrl_key" ON "products"("privateUrl");

-- CreateIndex
CREATE INDEX "products_sku_idx" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "products_platform_idx" ON "products"("platform");

-- CreateIndex
CREATE INDEX "products_isActive_isPrivate_idx" ON "products"("isActive", "isPrivate");

-- CreateIndex
CREATE INDEX "products_price_idx" ON "products"("price");

-- CreateIndex
CREATE INDEX "products_stockCount_idx" ON "products"("stockCount");

-- CreateIndex
CREATE INDEX "products_soldCount_idx" ON "products"("soldCount");

-- CreateIndex
CREATE INDEX "products_createdAt_idx" ON "products"("createdAt");

-- CreateIndex
CREATE INDEX "products_sortOrder_idx" ON "products"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "product_groups_name_key" ON "product_groups"("name");

-- CreateIndex
CREATE INDEX "product_groups_name_idx" ON "product_groups"("name");

-- CreateIndex
CREATE INDEX "feedback_userId_idx" ON "feedback"("userId");

-- CreateIndex
CREATE INDEX "feedback_productId_idx" ON "feedback"("productId");

-- CreateIndex
CREATE INDEX "feedback_createdAt_idx" ON "feedback"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FakeNames_name_key" ON "FakeNames"("name");

-- CreateIndex
CREATE INDEX "accounts_productId_idx" ON "accounts"("productId");

-- CreateIndex
CREATE INDEX "accounts_platform_idx" ON "accounts"("platform");

-- CreateIndex
CREATE INDEX "accounts_isUsed_isValid_idx" ON "accounts"("isUsed", "isValid");

-- CreateIndex
CREATE INDEX "accounts_createdAt_idx" ON "accounts"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_code_idx" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_status_idx" ON "coupons"("status");

-- CreateIndex
CREATE INDEX "coupons_expiresAt_idx" ON "coupons"("expiresAt");

-- CreateIndex
CREATE INDEX "coupons_scope_idx" ON "coupons"("scope");

-- CreateIndex
CREATE INDEX "coupons_createdAt_idx" ON "coupons"("createdAt");

-- CreateIndex
CREATE INDEX "coupon_usage_couponId_idx" ON "coupon_usage"("couponId");

-- CreateIndex
CREATE INDEX "coupon_usage_orderId_idx" ON "coupon_usage"("orderId");

-- CreateIndex
CREATE INDEX "coupon_usage_userId_idx" ON "coupon_usage"("userId");

-- CreateIndex
CREATE INDEX "coupon_usage_guestEmail_idx" ON "coupon_usage"("guestEmail");

-- CreateIndex
CREATE INDEX "coupon_usage_createdAt_idx" ON "coupon_usage"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_usage_couponId_orderId_key" ON "coupon_usage"("couponId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_name_key" ON "payment_methods"("name");

-- CreateIndex
CREATE INDEX "payment_methods_isActive_idx" ON "payment_methods"("isActive");

-- CreateIndex
CREATE INDEX "payment_methods_gateway_idx" ON "payment_methods"("gateway");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_packages_name_key" ON "subscription_packages"("name");

-- CreateIndex
CREATE INDEX "subscription_packages_isActive_idx" ON "subscription_packages"("isActive");

-- CreateIndex
CREATE INDEX "subscription_payments_userId_idx" ON "subscription_payments"("userId");

-- CreateIndex
CREATE INDEX "subscription_payments_subscriptionPackageId_idx" ON "subscription_payments"("subscriptionPackageId");

-- CreateIndex
CREATE INDEX "subscription_payments_paymentStatus_idx" ON "subscription_payments"("paymentStatus");

-- CreateIndex
CREATE INDEX "subscription_payments_periodStart_periodEnd_idx" ON "subscription_payments"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "subscription_payments_createdAt_idx" ON "subscription_payments"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "blog_categories_name_key" ON "blog_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "blog_categories_slug_key" ON "blog_categories"("slug");

-- CreateIndex
CREATE INDEX "blog_categories_slug_idx" ON "blog_categories"("slug");

-- CreateIndex
CREATE INDEX "blog_categories_name_idx" ON "blog_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "blogs_slug_key" ON "blogs"("slug");

-- CreateIndex
CREATE INDEX "blogs_slug_idx" ON "blogs"("slug");

-- CreateIndex
CREATE INDEX "blogs_categoryId_idx" ON "blogs"("categoryId");

-- CreateIndex
CREATE INDEX "blogs_isPublished_idx" ON "blogs"("isPublished");

-- CreateIndex
CREATE INDEX "blogs_publishedAt_idx" ON "blogs"("publishedAt");

-- CreateIndex
CREATE INDEX "blogs_views_idx" ON "blogs"("views");

-- CreateIndex
CREATE INDEX "blogs_createdAt_idx" ON "blogs"("createdAt");

-- CreateIndex
CREATE INDEX "blogs_tags_idx" ON "blogs"("tags");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_fileId_key" ON "gallery"("fileId");

-- CreateIndex
CREATE INDEX "gallery_url_idx" ON "gallery"("url");

-- CreateIndex
CREATE INDEX "gallery_fileId_idx" ON "gallery"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_orderNumber_idx" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_userId_idx" ON "orders"("userId");

-- CreateIndex
CREATE INDEX "orders_guestEmail_idx" ON "orders"("guestEmail");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_productId_idx" ON "orders"("productId");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "payments_orderId_key" ON "payments"("orderId");

-- CreateIndex
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_type_idx" ON "payments"("type");

-- CreateIndex
CREATE INDEX "payments_gatewayTxnId_idx" ON "payments"("gatewayTxnId");

-- CreateIndex
CREATE INDEX "payments_createdAt_idx" ON "payments"("createdAt");

-- CreateIndex
CREATE INDEX "otps_type_idx" ON "otps"("type");

-- CreateIndex
CREATE INDEX "otps_otp_idx" ON "otps"("otp");

-- CreateIndex
CREATE INDEX "otps_email_idx" ON "otps"("email");

-- CreateIndex
CREATE INDEX "deliveries_orderId_idx" ON "deliveries"("orderId");

-- CreateIndex
CREATE INDEX "deliveries_status_idx" ON "deliveries"("status");

-- CreateIndex
CREATE INDEX "deliveries_createdAt_idx" ON "deliveries"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_transfers_orderId_key" ON "telegram_transfers"("orderId");

-- CreateIndex
CREATE INDEX "telegram_transfers_orderId_idx" ON "telegram_transfers"("orderId");

-- CreateIndex
CREATE INDEX "telegram_transfers_status_idx" ON "telegram_transfers"("status");

-- CreateIndex
CREATE INDEX "telegram_transfers_customerTelegram_idx" ON "telegram_transfers"("customerTelegram");

-- CreateIndex
CREATE INDEX "telegram_transfers_transferType_idx" ON "telegram_transfers"("transferType");

-- CreateIndex
CREATE INDEX "telegram_transfers_targetUrl_idx" ON "telegram_transfers"("targetUrl");

-- CreateIndex
CREATE INDEX "telegram_transfers_joinVerified_idx" ON "telegram_transfers"("joinVerified");

-- CreateIndex
CREATE INDEX "telegram_transfers_createdAt_idx" ON "telegram_transfers"("createdAt");

-- CreateIndex
CREATE INDEX "affiliates_currency_idx" ON "affiliates"("currency");

-- CreateIndex
CREATE INDEX "affiliates_isPaid_idx" ON "affiliates"("isPaid");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticketNumber_key" ON "tickets"("ticketNumber");

-- CreateIndex
CREATE INDEX "tickets_ticketNumber_idx" ON "tickets"("ticketNumber");

-- CreateIndex
CREATE INDEX "tickets_userId_idx" ON "tickets"("userId");

-- CreateIndex
CREATE INDEX "tickets_guestEmail_idx" ON "tickets"("guestEmail");

-- CreateIndex
CREATE INDEX "tickets_status_priority_idx" ON "tickets"("status", "priority");

-- CreateIndex
CREATE INDEX "tickets_createdAt_idx" ON "tickets"("createdAt");

-- CreateIndex
CREATE INDEX "ticket_replies_ticketId_idx" ON "ticket_replies"("ticketId");

-- CreateIndex
CREATE INDEX "ticket_replies_createdAt_idx" ON "ticket_replies"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_role_idx" ON "notifications"("role");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "notification_read_status_userId_idx" ON "notification_read_status"("userId");

-- CreateIndex
CREATE INDEX "notification_read_status_notificationId_idx" ON "notification_read_status"("notificationId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_read_status_notificationId_userId_key" ON "notification_read_status"("notificationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_telegram_data_userId_key" ON "customer_telegram_data"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_telegram_data_username_key" ON "customer_telegram_data"("username");

-- CreateIndex
CREATE UNIQUE INDEX "customer_telegram_data_phoneNumber_key" ON "customer_telegram_data"("phoneNumber");

-- CreateIndex
CREATE INDEX "customer_telegram_data_userId_idx" ON "customer_telegram_data"("userId");

-- CreateIndex
CREATE INDEX "customer_telegram_data_username_idx" ON "customer_telegram_data"("username");

-- CreateIndex
CREATE INDEX "customer_telegram_data_phoneNumber_idx" ON "customer_telegram_data"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "custom_pages_slug_key" ON "custom_pages"("slug");

-- CreateIndex
CREATE INDEX "custom_pages_slug_idx" ON "custom_pages"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "login_sessions_token_key" ON "login_sessions"("token");

-- CreateIndex
CREATE INDEX "login_sessions_userId_idx" ON "login_sessions"("userId");

-- CreateIndex
CREATE INDEX "login_sessions_token_idx" ON "login_sessions"("token");

-- CreateIndex
CREATE INDEX "login_sessions_expiresAt_idx" ON "login_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "balance_transactions_userId_idx" ON "balance_transactions"("userId");

-- CreateIndex
CREATE INDEX "balance_transactions_type_idx" ON "balance_transactions"("type");

-- CreateIndex
CREATE INDEX "balance_transactions_createdAt_idx" ON "balance_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "balance_transactions_reference_idx" ON "balance_transactions"("reference");

-- CreateIndex
CREATE INDEX "withdrawals_userId_idx" ON "withdrawals"("userId");

-- CreateIndex
CREATE INDEX "withdrawals_status_idx" ON "withdrawals"("status");

-- CreateIndex
CREATE INDEX "withdrawals_createdAt_idx" ON "withdrawals"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE INDEX "settings_key_idx" ON "settings"("key");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs"("entity");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "visitors_date_idx" ON "visitors"("date");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "ranks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_subscriptionPackageId_fkey" FOREIGN KEY ("subscriptionPackageId") REFERENCES "subscription_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_productGroupId_fkey" FOREIGN KEY ("productGroupId") REFERENCES "product_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_groups" ADD CONSTRAINT "product_groups_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_usedByOrderId_fkey" FOREIGN KEY ("usedByOrderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usage" ADD CONSTRAINT "coupon_usage_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usage" ADD CONSTRAINT "coupon_usage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usage" ADD CONSTRAINT "coupon_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscriptionPackageId_fkey" FOREIGN KEY ("subscriptionPackageId") REFERENCES "subscription_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blogs" ADD CONSTRAINT "blogs_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "blog_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_transfers" ADD CONSTRAINT "telegram_transfers_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_replies" ADD CONSTRAINT "ticket_replies_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_read_status" ADD CONSTRAINT "notification_read_status_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_read_status" ADD CONSTRAINT "notification_read_status_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_sessions" ADD CONSTRAINT "login_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_transactions" ADD CONSTRAINT "balance_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
