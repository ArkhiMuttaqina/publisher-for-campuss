import { Injectable, NotFoundException } from "@nestjs/common";
import { BlogPost, PublishStatus } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateBlogPostDto } from "./dto/create-blog-post.dto";
import { PublishBlogPostDto } from "./dto/publish-blog-post.dto";
import { UpdateBlogPostDto } from "./dto/update-blog-post.dto";

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateBlogPostDto): Promise<BlogPost> {
    const { relatedBookIds, blogCategoryId, bookCategoryId, ...postData } = data;

    return this.prisma.blogPost.create({
      data: {
        ...postData,
        category: blogCategoryId ? { connect: { id: blogCategoryId } } : undefined,
        bookCategory: bookCategoryId ? { connect: { id: bookCategoryId } } : undefined,
        books: relatedBookIds
          ? {
              create: relatedBookIds.map((bookId) => ({
                book: { connect: { id: bookId } }
              }))
            }
          : undefined
      }
    });
  }

  findAll(): Promise<BlogPost[]> {
    return this.prisma.blogPost.findMany({
      include: {
        category: true,
        bookCategory: true,
        books: { include: { book: true } },
        seoMeta: true
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async findOne(id: string): Promise<BlogPost> {
    const post = await this.prisma.blogPost.findUnique({
      where: { id },
      include: {
        category: true,
        bookCategory: true,
        books: { include: { book: true } },
        seoMeta: true
      }
    });

    if (!post) {
      throw new NotFoundException("Blog post not found");
    }

    return post;
  }

  async update(id: string, data: UpdateBlogPostDto): Promise<BlogPost> {
    await this.findOne(id);

    const { relatedBookIds, blogCategoryId, bookCategoryId, ...postData } = data;

    return this.prisma.blogPost.update({
      where: { id },
      data: {
        ...postData,
        category: blogCategoryId ? { connect: { id: blogCategoryId } } : undefined,
        bookCategory: bookCategoryId ? { connect: { id: bookCategoryId } } : undefined,
        books: relatedBookIds
          ? {
              deleteMany: {},
              create: relatedBookIds.map((bookId) => ({
                book: { connect: { id: bookId } }
              }))
            }
          : undefined
      }
    });
  }

  async publish(id: string, body: PublishBlogPostDto): Promise<BlogPost> {
    await this.findOne(id);

    return this.prisma.blogPost.update({
      where: { id },
      data: {
        status: body.status === "published" ? PublishStatus.PUBLISHED : PublishStatus.DRAFT
      }
    });
  }

  async remove(id: string): Promise<BlogPost> {
    await this.findOne(id);
    return this.prisma.blogPost.delete({ where: { id } });
  }
}
