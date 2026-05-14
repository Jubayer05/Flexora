-- CreateTable
CREATE TABLE "blog_sub_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "authorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_sub_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blog_sub_categories_slug_key" ON "blog_sub_categories"("slug");

-- CreateIndex
CREATE INDEX "blog_sub_categories_slug_idx" ON "blog_sub_categories"("slug");
CREATE INDEX "blog_sub_categories_categoryId_idx" ON "blog_sub_categories"("categoryId");
CREATE INDEX "blog_sub_categories_authorId_idx" ON "blog_sub_categories"("authorId");

-- AddForeignKey
ALTER TABLE "blog_sub_categories" ADD CONSTRAINT "blog_sub_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "blog_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_sub_categories" ADD CONSTRAINT "blog_sub_categories_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "blog_authors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
