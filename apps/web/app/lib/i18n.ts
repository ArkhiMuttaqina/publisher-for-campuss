export type WebLanguage = "id" | "en";

export function parseWebLanguage(
  value: string | string[] | undefined,
): WebLanguage {
  if (Array.isArray(value)) {
    return value[0] === "id" ? "id" : "en";
  }

  return value === "id" ? "id" : "en";
}

type WebDictionary = {
  brand: string;
  navCatalog: string;
  navBlog: string;
  navHome: string;
  heroTagline: string;
  heroTitle: string;
  heroDescription: string;
  ctaCatalog: string;
  ctaBlog: string;
  sectionIaTitle: string;
  sectionIaDescription: string;
  sectionCards: Array<{ title: string; desc: string }>;
  catalogTitle: string;
  catalogDescription: string;
  catalogEmpty: string;
  catalogReadDetails: string;
  detailBackToCatalog: string;
  detailBackToHome: string;
  detailCategoryLabel: string;
  detailAuthorsLabel: string;
  detailNoAuthors: string;
  detailPublicationLabel: string;
  detailPreviewLabel: string;
  detailPreviewUnavailable: string;
  detailOpenPreview: string;
  blogTitle: string;
  blogDescription: string;
  languageLabel: string;
};

export const webDictionary: Record<WebLanguage, WebDictionary> = {
  en: {
    brand: "Campus Publisher",
    navCatalog: "Catalog",
    navBlog: "Blog",
    navHome: "Home",
    heroTagline: "Bilingual campus publishing platform",
    heroTitle:
      "Discover academic books and editorial insights from one trusted portal.",
    heroDescription:
      "Structured for campus usage with secure PDF workflows, editorial governance, and scalable discovery experience.",
    ctaCatalog: "Explore catalog",
    ctaBlog: "Read editorials",
    sectionIaTitle: "Information architecture",
    sectionIaDescription:
      "The public experience is organized into focused pathways for discovery, reading, and campus publishing updates.",
    sectionCards: [
      {
        title: "Discover",
        desc: "Browse books by category, author, and publication metadata.",
      },
      {
        title: "Read",
        desc: "Consume bilingual editorial content with SEO-optimized structure.",
      },
      {
        title: "Access",
        desc: "Open preview PDFs securely while full assets stay policy-controlled.",
      },
    ],
    catalogTitle: "Catalog",
    catalogDescription:
      "Public catalog discovery is ready for category, author, and publication integration.",
    catalogEmpty: "No public books are available yet.",
    catalogReadDetails: "Read details",
    detailBackToCatalog: "Back to catalog",
    detailBackToHome: "Back to home",
    detailCategoryLabel: "Category",
    detailAuthorsLabel: "Authors",
    detailNoAuthors: "No authors linked yet.",
    detailPublicationLabel: "Publication status",
    detailPreviewLabel: "PDF preview",
    detailPreviewUnavailable:
      "Use the embedded reader below or open the preview in a new tab.",
    detailOpenPreview: "Open preview in new tab",
    blogTitle: "Editorial Blog",
    blogDescription:
      "Campus editorial articles will be published here with bilingual presentation.",
    languageLabel: "Language",
  },
  id: {
    brand: "Penerbit Kampus",
    navCatalog: "Katalog",
    navBlog: "Blog",
    navHome: "Beranda",
    heroTagline: "Platform penerbitan kampus bilingual",
    heroTitle:
      "Temukan buku akademik dan wawasan editorial dalam satu portal tepercaya.",
    heroDescription:
      "Dirancang untuk kebutuhan kampus dengan alur PDF aman, tata kelola editorial, dan pengalaman penelusuran yang skalabel.",
    ctaCatalog: "Jelajahi katalog",
    ctaBlog: "Baca editorial",
    sectionIaTitle: "Arsitektur informasi",
    sectionIaDescription:
      "Pengalaman publik disusun menjadi jalur fokus untuk penelusuran, pembacaan, dan pembaruan penerbitan kampus.",
    sectionCards: [
      {
        title: "Temukan",
        desc: "Telusuri buku berdasarkan kategori, penulis, dan metadata publikasi.",
      },
      {
        title: "Baca",
        desc: "Nikmati konten editorial bilingual dengan struktur ramah SEO.",
      },
      {
        title: "Akses",
        desc: "Buka PDF pratinjau secara aman sementara aset penuh tetap terkontrol kebijakan.",
      },
    ],
    catalogTitle: "Katalog",
    catalogDescription:
      "Penelusuran katalog publik siap dihubungkan ke kategori, penulis, dan publikasi.",
    catalogEmpty: "Belum ada buku publik yang tersedia.",
    catalogReadDetails: "Lihat detail",
    detailBackToCatalog: "Kembali ke katalog",
    detailBackToHome: "Kembali ke beranda",
    detailCategoryLabel: "Kategori",
    detailAuthorsLabel: "Penulis",
    detailNoAuthors: "Belum ada penulis yang terhubung.",
    detailPublicationLabel: "Status publikasi",
    detailPreviewLabel: "Pratinjau PDF",
    detailPreviewUnavailable:
      "Gunakan pembaca tersemat di bawah atau buka pratinjau di tab baru.",
    detailOpenPreview: "Buka pratinjau di tab baru",
    blogTitle: "Blog Editorial",
    blogDescription:
      "Artikel editorial kampus akan dipublikasikan di sini dengan tampilan bilingual.",
    languageLabel: "Bahasa",
  },
};
