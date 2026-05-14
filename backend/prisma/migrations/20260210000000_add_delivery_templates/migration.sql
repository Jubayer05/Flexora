-- CreateTable
CREATE TABLE "delivery_templates" (
    "id" SERIAL NOT NULL,
    "thankYouMessage" TEXT,
    "couponPromotionText" TEXT,
    "supportContactInfo" TEXT,
    "feedbackRequestText" TEXT,
    "credentialsHeader" TEXT,
    "credentialsFormat" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_email_templates" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_email_templates_type_key" ON "auth_email_templates"("type");
