import { BadRequestException, Injectable } from "@nestjs/common";
import { SeoMeta } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { UpsertSeoMetaDto } from "./dto/upsert-seo-meta.dto";

@Injectable()
export class SeoService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(data: UpsertSeoMetaDto): Promise<SeoMeta> {
    const hasBook = Boolean(data.bookId);
    const hasBlog = Boolean(data.blogPostId);

    if (hasBook === hasBlog) {
      throw new BadRequestException("Provide exactly one target: bookId or blogPostId");
    }

    const where = data.bookId ? { bookId: data.bookId } : { blogPostId: data.blogPostId };

    return this.prisma.seoMeta.upsert({
      where,
      create: {
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        canonicalUrl: data.canonicalUrl,
        ogImageUrl: data.ogImageUrl,
        book: data.bookId ? { connect: { id: data.bookId } } : undefined,
        blogPost: data.blogPostId ? { connect: { id: data.blogPostId } } : undefined
      },
      update: {
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        canonicalUrl: data.canonicalUrl,
        ogImageUrl: data.ogImageUrl
      }
    });
  }

  findForBook(bookId: string): Promise<SeoMeta | null> {
    return this.prisma.seoMeta.findUnique({ where: { bookId } });
  }

  findForBlogPost(blogPostId: string): Promise<SeoMeta | null> {
    return this.prisma.seoMeta.findUnique({ where: { blogPostId } });
  }
}
