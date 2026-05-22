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
import { BlogPost } from "@prisma/client";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import { Public } from "../../common/auth/public.decorator";
import { BlogService } from "./blog.service";
import { CreateBlogPostDto } from "./dto/create-blog-post.dto";
import { PublishBlogPostDto } from "./dto/publish-blog-post.dto";
import { UpdateBlogPostDto } from "./dto/update-blog-post.dto";

@Controller("blog-posts")
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Public()
  @Get()
  findAll(): Promise<BlogPost[]> {
    return this.blogService.findAll();
  }

  @Public()
  @Get(":id")
  findOne(@Param("id") id: string): Promise<BlogPost> {
    return this.blogService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("super_admin", "editor")
  @Post()
  create(@Body() body: CreateBlogPostDto): Promise<BlogPost> {
    return this.blogService.create(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("super_admin", "editor")
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() body: UpdateBlogPostDto,
  ): Promise<BlogPost> {
    return this.blogService.update(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("super_admin", "editor")
  @Patch(":id/publish")
  publish(
    @Param("id") id: string,
    @Body() body: PublishBlogPostDto,
  ): Promise<BlogPost> {
    return this.blogService.publish(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("super_admin")
  @Delete(":id")
  remove(@Param("id") id: string): Promise<BlogPost> {
    return this.blogService.remove(id);
  }
}
