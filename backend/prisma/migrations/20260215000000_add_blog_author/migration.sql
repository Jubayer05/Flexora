-- CreateTable
CREATE TABLE "blog_authors" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "bio" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_authors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blog_authors_name_idx" ON "blog_authors"("name");
CREATE INDEX "blog_authors_email_idx" ON "blog_authors"("email");
CREATE INDEX "blog_authors_isActive_idx" ON "blog_authors"("isActive");

-- AlterTable
ALTER TABLE "blogs" ADD COLUMN "authorId" INTEGER;

-- CreateIndex
CREATE INDEX "blogs_authorId_idx" ON "blogs"("authorId");

-- AddForeignKey
ALTER TABLE "blogs" ADD CONSTRAINT "blogs_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "blog_authors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
