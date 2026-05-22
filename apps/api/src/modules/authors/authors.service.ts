import { Injectable, NotFoundException } from "@nestjs/common";
import { Author } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateAuthorDto } from "./dto/create-author.dto";
import { UpdateAuthorDto } from "./dto/update-author.dto";

@Injectable()
export class AuthorsService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateAuthorDto): Promise<Author> {
    return this.prisma.author.create({ data });
  }

  findAll(): Promise<Author[]> {
    return this.prisma.author.findMany({ orderBy: { createdAt: "desc" } });
  }

  async findOne(id: string): Promise<Author> {
    const author = await this.prisma.author.findUnique({ where: { id } });

    if (!author) {
      throw new NotFoundException("Author not found");
    }

    return author;
  }

  async update(id: string, data: UpdateAuthorDto): Promise<Author> {
    await this.findOne(id);
    return this.prisma.author.update({ where: { id }, data });
  }

  async remove(id: string): Promise<Author> {
    await this.findOne(id);
    return this.prisma.author.delete({ where: { id } });
  }
}
