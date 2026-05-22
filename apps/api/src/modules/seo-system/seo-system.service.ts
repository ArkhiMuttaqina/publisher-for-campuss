import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class SeoSystemService {
  constructor(private readonly prisma: PrismaService) {}

  private siteUrl(): string {
    return process.env.PUBLIC_SITE_URL ?? "http://localhost:3001";
  }

  generateRobotsTxt(): string {
    const siteUrl = this.siteUrl();
    return `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
  }

  async generateSitemapXml(): Promise<string> {
    const siteUrl = this.siteUrl();

    const [books, authors, posts, categories] = await Promise.all([
      this.prisma.book.findMany({ where: {}, select: { slug: true, updatedAt: true } }),
      this.prisma.author.findMany({ select: { slug: true, updatedAt: true } }),
      this.prisma.blogPost.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
      this.prisma.category.findMany({ select: { slug: true, updatedAt: true } })
    ]);

    const staticEntries = [
      { loc: `${siteUrl}/`, lastmod: new Date().toISOString() },
      { loc: `${siteUrl}/catalog`, lastmod: new Date().toISOString() },
      { loc: `${siteUrl}/blog`, lastmod: new Date().toISOString() }
    ];

    const dynamicEntries = [
      ...books.map((book) => ({ loc: `${siteUrl}/books/${book.slug}`, lastmod: book.updatedAt.toISOString() })),
      ...authors.map((author) => ({ loc: `${siteUrl}/authors/${author.slug}`, lastmod: author.updatedAt.toISOString() })),
      ...posts.map((post) => ({ loc: `${siteUrl}/blog/${post.slug}`, lastmod: post.updatedAt.toISOString() })),
      ...categories.map((category) => ({ loc: `${siteUrl}/category/${category.slug}`, lastmod: category.updatedAt.toISOString() }))
    ];

    const entries = [...staticEntries, ...dynamicEntries];

    const urlNodes = entries
      .map(
        (entry) =>
          `<url><loc>${entry.loc}</loc><lastmod>${entry.lastmod}</lastmod><changefreq>weekly</changefreq></url>`
      )
      .join("");

    return `<?xml version="1.0" encoding="UTF-8"?>` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlNodes}</urlset>`;
  }
}
