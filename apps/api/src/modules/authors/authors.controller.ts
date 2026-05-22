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
import { Author } from "@prisma/client";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import { Public } from "../../common/auth/public.decorator";
import { AuthorsService } from "./authors.service";
import { CreateAuthorDto } from "./dto/create-author.dto";
import { UpdateAuthorDto } from "./dto/update-author.dto";

@Controller("authors")
export class AuthorsController {
  constructor(private readonly authorsService: AuthorsService) {}

  @Public()
  @Get()
  findAll(): Promise<Author[]> {
    return this.authorsService.findAll();
  }

  @Public()
  @Get(":id")
  findOne(@Param("id") id: string): Promise<Author> {
    return this.authorsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("super_admin", "author_manager")
  @Post()
  create(@Body() body: CreateAuthorDto): Promise<Author> {
    return this.authorsService.create(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("super_admin", "author_manager")
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() body: UpdateAuthorDto,
  ): Promise<Author> {
    return this.authorsService.update(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("super_admin")
  @Delete(":id")
  remove(@Param("id") id: string): Promise<Author> {
    return this.authorsService.remove(id);
  }
}
