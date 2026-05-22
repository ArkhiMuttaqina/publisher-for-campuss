import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const defaultCampus = await prisma.campus.upsert({
    where: { slug: "default-campus" },
    update: {},
    create: {
      name: "Default Campus",
      slug: "default-campus",
    },
  });

  const roleNames = [
    "super_admin",
    "publisher_admin",
    "editor",
    "catalog_manager",
    "author_manager",
    "reviewer",
    "submission_user",
    "viewer",
  ];

  const roleRecords = new Map();
  for (const name of roleNames) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    roleRecords.set(name, role.id);
  }

  const defaultPasswordHash = await bcrypt.hash("ChangeMe123!", 10);
  const users = [
    {
      email: "admin@campus.local",
      fullName: "Campus Super Admin",
      role: "super_admin",
    },
    {
      email: "publisher@campus.local",
      fullName: "Campus Publisher",
      role: "publisher_admin",
    },
    { email: "editor@campus.local", fullName: "Campus Editor", role: "editor" },
    {
      email: "catalog@campus.local",
      fullName: "Catalog Manager",
      role: "catalog_manager",
    },
    {
      email: "reviewer@campus.local",
      fullName: "Submission Reviewer",
      role: "reviewer",
    },
    {
      email: "submitter@campus.local",
      fullName: "Submission User",
      role: "submission_user",
    },
  ];

  const userRecords = new Map();
  for (const user of users) {
    const record = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        fullName: user.fullName,
        roleId: roleRecords.get(user.role),
        passwordHash: defaultPasswordHash,
        campusId: defaultCampus.id,
      },
      create: {
        email: user.email,
        fullName: user.fullName,
        roleId: roleRecords.get(user.role),
        passwordHash: defaultPasswordHash,
        campusId: defaultCampus.id,
      },
    });
    userRecords.set(user.email, record.id);
  }

  const category = await prisma.category.upsert({
    where: { slug: "computer-science" },
    update: {
      name: "Computer Science",
      nameId: "Ilmu Komputer",
      nameEn: "Computer Science",
      descriptionId: "Koleksi publikasi ilmu komputer",
      descriptionEn: "Computer science publications collection",
      campusId: defaultCampus.id,
    },
    create: {
      name: "Computer Science",
      slug: "computer-science",
      seoTitle: "Computer Science",
      nameId: "Ilmu Komputer",
      nameEn: "Computer Science",
      descriptionId: "Koleksi publikasi ilmu komputer",
      descriptionEn: "Computer science publications collection",
      campusId: defaultCampus.id,
    },
  });

  const author = await prisma.author.upsert({
    where: { slug: "dr-arif-pratama" },
    update: {
      name: "Dr. Arif Pratama",
      biography: "Peneliti pembelajaran mesin terapan",
      biographyId: "Peneliti pembelajaran mesin terapan",
      biographyEn: "Applied machine learning researcher",
      campusId: defaultCampus.id,
    },
    create: {
      name: "Dr. Arif Pratama",
      slug: "dr-arif-pratama",
      biography: "Peneliti pembelajaran mesin terapan",
      biographyId: "Peneliti pembelajaran mesin terapan",
      biographyEn: "Applied machine learning researcher",
      campusId: defaultCampus.id,
    },
  });

  const book = await prisma.book.upsert({
    where: { slug: "ml-campus-handbook" },
    update: {
      title: "Machine Learning for Campus Projects",
      titleId: "Machine Learning untuk Proyek Kampus",
      titleEn: "Machine Learning for Campus Projects",
      summary: "Practical reference for campus AI systems",
      summaryId: "Referensi praktis untuk sistem AI kampus",
      summaryEn: "Practical reference for campus AI systems",
      categoryId: category.id,
      campusId: defaultCampus.id,
    },
    create: {
      title: "Machine Learning for Campus Projects",
      titleId: "Machine Learning untuk Proyek Kampus",
      titleEn: "Machine Learning for Campus Projects",
      slug: "ml-campus-handbook",
      summary: "Practical reference for campus AI systems",
      summaryId: "Referensi praktis untuk sistem AI kampus",
      summaryEn: "Practical reference for campus AI systems",
      categoryId: category.id,
      campusId: defaultCampus.id,
    },
  });

  await prisma.bookAuthor.upsert({
    where: { bookId_authorId: { bookId: book.id, authorId: author.id } },
    update: {},
    create: { bookId: book.id, authorId: author.id },
  });

  const publication = await prisma.publication.upsert({
    where: { id: `${book.id}-v1` },
    update: { status: "PUBLISHED", isPublic: true, publishedAt: new Date() },
    create: {
      id: `${book.id}-v1`,
      bookId: book.id,
      editionLabel: "v1",
      isbn: "978-602-0000-00-1",
      status: "PUBLISHED",
      isPublic: true,
      publishedAt: new Date(),
    },
  });

  const media = await prisma.mediaAsset.upsert({
    where: { storageKey: "seed/books/ml-campus-handbook-preview.pdf" },
    update: {
      fileName: "ml-campus-handbook-preview.pdf",
      mimeType: "application/pdf",
      publicUrl: "/media/public/ml-campus-handbook-preview.pdf",
      sizeBytes: 120000,
      visibility: "PUBLIC",
      malwareScanStatus: "clean",
      malwareScannedAt: new Date(),
      campusId: defaultCampus.id,
    },
    create: {
      fileName: "ml-campus-handbook-preview.pdf",
      mimeType: "application/pdf",
      storageKey: "seed/books/ml-campus-handbook-preview.pdf",
      publicUrl: "/media/public/ml-campus-handbook-preview.pdf",
      sizeBytes: 120000,
      visibility: "PUBLIC",
      malwareScanStatus: "clean",
      malwareScannedAt: new Date(),
      campusId: defaultCampus.id,
    },
  });

  await prisma.bookFile.upsert({
    where: { id: `${publication.id}-preview` },
    update: {
      bookId: book.id,
      fileType: "pdf",
      assetId: media.id,
      visibility: "PUBLIC",
      isPreview: true,
      locale: "id",
    },
    create: {
      id: `${publication.id}-preview`,
      bookId: book.id,
      fileType: "pdf",
      assetId: media.id,
      visibility: "PUBLIC",
      isPreview: true,
      locale: "id",
    },
  });

  const blogCategory = await prisma.blogCategory.upsert({
    where: { slug: "campus-innovation" },
    update: { name: "Campus Innovation" },
    create: { name: "Campus Innovation", slug: "campus-innovation" },
  });

  await prisma.blogPost.upsert({
    where: { slug: "launching-campus-publisher" },
    update: {
      title: "Launching Campus Publisher",
      titleId: "Peluncuran Campus Publisher",
      titleEn: "Launching Campus Publisher",
      excerpt: "How our campus digitized academic publishing",
      excerptId: "Bagaimana kampus mendigitalisasi publikasi akademik",
      excerptEn: "How our campus digitized academic publishing",
      content: "Initial release story",
      status: "PUBLISHED",
      authorName: "Campus Editorial Team",
      authorId: author.id,
      categoryId: blogCategory.id,
      bookCategoryId: category.id,
      campusId: defaultCampus.id,
    },
    create: {
      title: "Launching Campus Publisher",
      titleId: "Peluncuran Campus Publisher",
      titleEn: "Launching Campus Publisher",
      slug: "launching-campus-publisher",
      excerpt: "How our campus digitized academic publishing",
      excerptId: "Bagaimana kampus mendigitalisasi publikasi akademik",
      excerptEn: "How our campus digitized academic publishing",
      content: "Initial release story",
      status: "PUBLISHED",
      authorName: "Campus Editorial Team",
      authorId: author.id,
      categoryId: blogCategory.id,
      bookCategoryId: category.id,
      campusId: defaultCampus.id,
    },
  });

  await prisma.submission.upsert({
    where: { id: "seed-submission-ml-001" },
    update: {
      submittedByUserId: userRecords.get("submitter@campus.local"),
      title: "AI for Academic Archive Discovery",
      titleId: "AI untuk Pencarian Arsip Akademik",
      titleEn: "AI for Academic Archive Discovery",
      description: "Student proposal for semantic discovery.",
      descriptionId: "Proposal mahasiswa untuk pencarian semantik.",
      descriptionEn: "Student proposal for semantic discovery.",
      status: "SUBMITTED",
      bookId: book.id,
      campusId: defaultCampus.id,
    },
    create: {
      id: "seed-submission-ml-001",
      submittedByUserId: userRecords.get("submitter@campus.local"),
      title: "AI for Academic Archive Discovery",
      titleId: "AI untuk Pencarian Arsip Akademik",
      titleEn: "AI for Academic Archive Discovery",
      description: "Student proposal for semantic discovery.",
      descriptionId: "Proposal mahasiswa untuk pencarian semantik.",
      descriptionEn: "Student proposal for semantic discovery.",
      status: "SUBMITTED",
      bookId: book.id,
      campusId: defaultCampus.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: userRecords.get("admin@campus.local"),
      action: "seed.bootstrap",
      entityType: "system",
      entityId: "task-3",
      status: "success",
      metadata: {
        rolesSeeded: roleNames.length,
        usersSeeded: users.length,
        sampleBookSlug: book.slug,
      },
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
