/*
  Warnings:

  - A unique constraint covering the columns `[authorId]` on the table `SeoMeta` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[categoryId]` on the table `SeoMeta` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Author" ADD COLUMN     "campusId" TEXT;

-- AlterTable
ALTER TABLE "BlogPost" ADD COLUMN     "authorId" TEXT,
ADD COLUMN     "campusId" TEXT;

-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "campusId" TEXT;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "campusId" TEXT;

-- AlterTable
ALTER TABLE "MediaAsset" ADD COLUMN     "campusId" TEXT;

-- AlterTable
ALTER TABLE "SeoMeta" ADD COLUMN     "authorId" TEXT,
ADD COLUMN     "categoryId" TEXT;

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "bookId" TEXT,
ADD COLUMN     "campusId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "campusId" TEXT;

-- CreateTable
CREATE TABLE "Campus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Campus_slug_key" ON "Campus"("slug");

-- CreateIndex
CREATE INDEX "Author_campusId_idx" ON "Author"("campusId");

-- CreateIndex
CREATE INDEX "BlogPost_campusId_idx" ON "BlogPost"("campusId");

-- CreateIndex
CREATE INDEX "Book_campusId_idx" ON "Book"("campusId");

-- CreateIndex
CREATE INDEX "Category_campusId_idx" ON "Category"("campusId");

-- CreateIndex
CREATE INDEX "MediaAsset_campusId_idx" ON "MediaAsset"("campusId");

-- CreateIndex
CREATE UNIQUE INDEX "SeoMeta_authorId_key" ON "SeoMeta"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "SeoMeta_categoryId_key" ON "SeoMeta"("categoryId");

-- CreateIndex
CREATE INDEX "Submission_campusId_idx" ON "Submission"("campusId");

-- CreateIndex
CREATE INDEX "User_campusId_idx" ON "User"("campusId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Author" ADD CONSTRAINT "Author_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoMeta" ADD CONSTRAINT "SeoMeta_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoMeta" ADD CONSTRAINT "SeoMeta_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
