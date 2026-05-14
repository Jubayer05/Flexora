-- CreateEnum
CREATE TYPE "UrlTrackingPageType" AS ENUM ('EXISTING', 'NON_EXISTING');

-- CreateTable
CREATE TABLE "url_trackings" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "uniqueClickCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessed" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "pageType" "UrlTrackingPageType" NOT NULL DEFAULT 'NON_EXISTING',
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "url_trackings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "url_click_trackings" (
    "id" SERIAL NOT NULL,
    "urlTrackingId" INTEGER NOT NULL,
    "visitorId" TEXT NOT NULL,
    "clickCount" INTEGER NOT NULL DEFAULT 1,
    "deviceInfo" JSONB,
    "location" JSONB,
    "firstClickAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastClickAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "url_click_trackings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "url_trackings_url_key" ON "url_trackings"("url");

-- CreateIndex
CREATE UNIQUE INDEX "url_trackings_slug_key" ON "url_trackings"("slug");

-- CreateIndex
CREATE INDEX "url_trackings_slug_idx" ON "url_trackings"("slug");

-- CreateIndex
CREATE INDEX "url_trackings_isActive_idx" ON "url_trackings"("isActive");

-- CreateIndex
CREATE INDEX "url_trackings_clickCount_idx" ON "url_trackings"("clickCount");

-- CreateIndex
CREATE INDEX "url_trackings_uniqueClickCount_idx" ON "url_trackings"("uniqueClickCount");

-- CreateIndex
CREATE UNIQUE INDEX "url_click_trackings_urlTrackingId_visitorId_key" ON "url_click_trackings"("urlTrackingId", "visitorId");

-- CreateIndex
CREATE INDEX "url_click_trackings_urlTrackingId_idx" ON "url_click_trackings"("urlTrackingId");

-- CreateIndex
CREATE INDEX "url_click_trackings_visitorId_idx" ON "url_click_trackings"("visitorId");

-- CreateIndex
CREATE INDEX "url_click_trackings_lastClickAt_idx" ON "url_click_trackings"("lastClickAt");

-- AddForeignKey
ALTER TABLE "url_trackings" ADD CONSTRAINT "url_trackings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "url_click_trackings" ADD CONSTRAINT "url_click_trackings_urlTrackingId_fkey" FOREIGN KEY ("urlTrackingId") REFERENCES "url_trackings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
