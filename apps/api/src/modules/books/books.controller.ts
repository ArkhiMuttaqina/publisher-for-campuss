import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Book } from "@prisma/client";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import { Public } from "../../common/auth/public.decorator";
import { BooksService } from "./books.service";
import { CreateBookDto } from "./dto/create-book.dto";
import { UpdateBookDto } from "./dto/update-book.dto";

@Controller("books")
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Public()
  @Get()
  findAll(): Promise<Book[]> {
    return this.booksService.findAll();
  }

  @Public()
  @Get(":id")
  findOne(@Param("id") id: string): Promise<Book> {
    return this.booksService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("super_admin", "catalog_manager")
  @Post()
  create(@Body() body: CreateBookDto): Promise<Book> {
    return this.booksService.create(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("super_admin", "catalog_manager")
  @Patch(":id")
  update(@Param("id") id: string, @Body() body: UpdateBookDto): Promise<Book> {
    return this.booksService.update(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("super_admin")
  @Delete(":id")
  remove(@Param("id") id: string): Promise<Book> {
    return this.booksService.remove(id);
  }
}
