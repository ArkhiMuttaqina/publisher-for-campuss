import { Injectable, NotFoundException } from "@nestjs/common";
import { Book, Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateBookDto } from "./dto/create-book.dto";
import { UpdateBookDto } from "./dto/update-book.dto";

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateBookDto): Promise<Book> {
    const { authorIds, categoryId, publicationYear, editionLabel, isbn, ...bookData } = data;

    const createInput: Prisma.BookCreateInput = {
      ...bookData,
      category: { connect: { id: categoryId } },
      authors: {
        create: authorIds.map((authorId) => ({
          author: { connect: { id: authorId } }
        }))
      },
      publications: {
        create: {
          editionLabel,
          isbn,
          publicationDate: new Date(publicationYear, 0, 1)
        }
      }
    };

    return this.prisma.book.create({ data: createInput });
  }

  findAll(): Promise<Book[]> {
    return this.prisma.book.findMany({
      include: {
        category: true,
        authors: { include: { author: true } },
        publications: true
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async findOne(id: string): Promise<Book> {
    const book = await this.prisma.book.findUnique({
      where: { id },
      include: {
        category: true,
        authors: { include: { author: true } },
        publications: true,
        seoMeta: true
      }
    });

    if (!book) {
      throw new NotFoundException("Book not found");
    }

    return book;
  }

  async update(id: string, data: UpdateBookDto): Promise<Book> {
    await this.findOne(id);

    const { authorIds, categoryId, publicationYear, editionLabel, isbn, ...bookData } = data;

    const updateData: Prisma.BookUpdateInput = {
      ...bookData
    };

    if (categoryId) {
      updateData.category = { connect: { id: categoryId } };
    }

    if (authorIds) {
      updateData.authors = {
        deleteMany: {},
        create: authorIds.map((authorId) => ({
          author: { connect: { id: authorId } }
        }))
      };
    }

    if (publicationYear || editionLabel || isbn) {
      updateData.publications = {
        deleteMany: {},
        create: {
          editionLabel,
          isbn,
          publicationDate: publicationYear ? new Date(publicationYear, 0, 1) : undefined
        }
      };
    }

    return this.prisma.book.update({ where: { id }, data: updateData });
  }

  async remove(id: string): Promise<Book> {
    await this.findOne(id);
    return this.prisma.book.delete({ where: { id } });
  }
}
