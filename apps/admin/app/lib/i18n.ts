export type AdminLanguage = "id" | "en";

export const ADMIN_LANG_COOKIE = "admin_lang";

type Dictionary = {
  appTitle: string;
  appDescription: string;
  modulesTitle: string;
  modules: string[];
  createBlogTitle: string;
  publishBlogTitle: string;
  seoTitle: string;
  uploadTitle: string;
  titleLabel: string;
  slugLabel: string;
  authorLabel: string;
  excerptLabel: string;
  contentLabel: string;
  submitCreate: string;
  postIdLabel: string;
  statusLabel: string;
  submitStatus: string;
  targetTypeLabel: string;
  targetIdLabel: string;
  metaTitleLabel: string;
  metaDescriptionLabel: string;
  canonicalUrlLabel: string;
  ogImageLabel: string;
  submitSeo: string;
  fileTypeLabel: string;
  visibilityLabel: string;
  localeLabel: string;
  bookIdLabel: string;
  fileLabel: string;
  submitUpload: string;
  signOut: string;
  languageLabel: string;
  categoryCrudTitle: string;
  authorCrudTitle: string;
  bookCrudTitle: string;
  biographyLabel: string;
  avatarUrlLabel: string;
  summaryLabel: string;
  categoryIdLabel: string;
  publicationYearLabel: string;
  authorIdsLabel: string;
  editionLabel: string;
  isbnLabel: string;
  updateBlogTitle: string;
  deleteBlogTitle: string;
  idLabel: string;
  submitUpdate: string;
  submitDelete: string;
  submissionsTitle: string;
  submittedByUserIdLabel: string;
  descriptionLabel: string;
  titleIdLabel: string;
  titleEnLabel: string;
  descriptionIdLabel: string;
  descriptionEnLabel: string;
  submissionStatusTitle: string;
  reviewerIdLabel: string;
  reviewerNotesLabel: string;
  roleOpsTitle: string;
  roleNameLabel: string;
};

export const adminDictionary: Record<AdminLanguage, Dictionary> = {
  en: {
    appTitle: "Publisher CMS",
    appDescription:
      "Operational console with live API-integrated blog, SEO, and media workflows.",
    modulesTitle: "Core modules",
    modules: [
      "Books management",
      "Authors management",
      "Categories management",
      "Blog editor",
      "Media library",
      "SEO manager",
    ],
    createBlogTitle: "Create Blog Post",
    publishBlogTitle: "Publish / Unpublish Blog",
    seoTitle: "Upsert SEO Meta",
    uploadTitle: "Upload Media",
    titleLabel: "Title",
    slugLabel: "Slug",
    authorLabel: "Author name",
    excerptLabel: "Excerpt",
    contentLabel: "Article content",
    submitCreate: "Create",
    postIdLabel: "Blog post ID",
    statusLabel: "Status",
    submitStatus: "Apply status",
    targetTypeLabel: "Target type",
    targetIdLabel: "Target ID",
    metaTitleLabel: "Meta title",
    metaDescriptionLabel: "Meta description",
    canonicalUrlLabel: "Canonical URL",
    ogImageLabel: "OG image URL",
    submitSeo: "Upsert SEO",
    fileTypeLabel: "File type",
    visibilityLabel: "Visibility",
    localeLabel: "Locale",
    bookIdLabel: "Book ID (optional for blog image)",
    fileLabel: "File",
    submitUpload: "Upload",
    signOut: "Sign out",
    languageLabel: "Language",
    categoryCrudTitle: "Create Category",
    authorCrudTitle: "Create Author",
    bookCrudTitle: "Create Book",
    biographyLabel: "Biography",
    avatarUrlLabel: "Avatar URL",
    summaryLabel: "Summary",
    categoryIdLabel: "Category ID",
    publicationYearLabel: "Publication year",
    authorIdsLabel: "Author IDs (comma separated)",
    editionLabel: "Edition label",
    isbnLabel: "ISBN",
    updateBlogTitle: "Update Blog Post",
    deleteBlogTitle: "Delete Blog Post",
    idLabel: "ID",
    submitUpdate: "Update",
    submitDelete: "Delete",
    submissionsTitle: "Create Submission",
    submittedByUserIdLabel: "Submitter User ID",
    descriptionLabel: "Description",
    titleIdLabel: "Title (ID)",
    titleEnLabel: "Title (EN)",
    descriptionIdLabel: "Description (ID)",
    descriptionEnLabel: "Description (EN)",
    submissionStatusTitle: "Update Submission Status",
    reviewerIdLabel: "Reviewer User ID",
    reviewerNotesLabel: "Reviewer notes",
    roleOpsTitle: "Update User Role",
    roleNameLabel: "Role name",
  },
  id: {
    appTitle: "CMS Penerbit",
    appDescription:
      "Konsol operasional dengan alur blog, SEO, dan media terintegrasi API.",
    modulesTitle: "Modul inti",
    modules: [
      "Manajemen buku",
      "Manajemen penulis",
      "Manajemen kategori",
      "Editor blog",
      "Perpustakaan media",
      "Manajer SEO",
    ],
    createBlogTitle: "Buat Postingan Blog",
    publishBlogTitle: "Publikasikan / Tarik Blog",
    seoTitle: "Perbarui SEO Meta",
    uploadTitle: "Unggah Media",
    titleLabel: "Judul",
    slugLabel: "Slug",
    authorLabel: "Nama penulis",
    excerptLabel: "Ringkasan",
    contentLabel: "Konten artikel",
    submitCreate: "Buat",
    postIdLabel: "ID postingan blog",
    statusLabel: "Status",
    submitStatus: "Terapkan status",
    targetTypeLabel: "Jenis target",
    targetIdLabel: "ID target",
    metaTitleLabel: "Judul meta",
    metaDescriptionLabel: "Deskripsi meta",
    canonicalUrlLabel: "URL kanonis",
    ogImageLabel: "URL gambar OG",
    submitSeo: "Simpan SEO",
    fileTypeLabel: "Tipe file",
    visibilityLabel: "Visibilitas",
    localeLabel: "Bahasa",
    bookIdLabel: "ID buku (opsional untuk gambar blog)",
    fileLabel: "Berkas",
    submitUpload: "Unggah",
    signOut: "Keluar",
    languageLabel: "Bahasa",
    categoryCrudTitle: "Buat Kategori",
    authorCrudTitle: "Buat Penulis",
    bookCrudTitle: "Buat Buku",
    biographyLabel: "Biografi",
    avatarUrlLabel: "URL Avatar",
    summaryLabel: "Ringkasan",
    categoryIdLabel: "ID Kategori",
    publicationYearLabel: "Tahun terbit",
    authorIdsLabel: "ID Penulis (pisahkan koma)",
    editionLabel: "Label edisi",
    isbnLabel: "ISBN",
    updateBlogTitle: "Perbarui Postingan Blog",
    deleteBlogTitle: "Hapus Postingan Blog",
    idLabel: "ID",
    submitUpdate: "Perbarui",
    submitDelete: "Hapus",
    submissionsTitle: "Buat Pengajuan",
    submittedByUserIdLabel: "ID Pengguna Pengaju",
    descriptionLabel: "Deskripsi",
    titleIdLabel: "Judul (ID)",
    titleEnLabel: "Judul (EN)",
    descriptionIdLabel: "Deskripsi (ID)",
    descriptionEnLabel: "Deskripsi (EN)",
    submissionStatusTitle: "Perbarui Status Pengajuan",
    reviewerIdLabel: "ID Pengguna Peninjau",
    reviewerNotesLabel: "Catatan peninjau",
    roleOpsTitle: "Perbarui Peran Pengguna",
    roleNameLabel: "Nama peran",
  },
};

export function parseAdminLanguage(value: string | undefined): AdminLanguage {
  return value === "id" ? "id" : "en";
}
