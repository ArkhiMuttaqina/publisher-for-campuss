import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { SeoMeta } from "@prisma/client";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import { Public } from "../../common/auth/public.decorator";
import { UpsertSeoMetaDto } from "./dto/upsert-seo-meta.dto";
import { SeoService } from "./seo.service";

@Controller("seo-meta")
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("super_admin", "editor")
  @Post("upsert")
  upsert(@Body() body: UpsertSeoMetaDto): Promise<SeoMeta> {
    return this.seoService.upsert(body);
  }

  @Public()
  @Get("book/:bookId")
  findBookMeta(@Param("bookId") bookId: string): Promise<SeoMeta | null> {
    return this.seoService.findForBook(bookId);
  }

  @Public()
  @Get("blog-post/:blogPostId")
  findBlogPostMeta(
    @Param("blogPostId") blogPostId: string,
  ): Promise<SeoMeta | null> {
    return this.seoService.findForBlogPost(blogPostId);
  }
}
