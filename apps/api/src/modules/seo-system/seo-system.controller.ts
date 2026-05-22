import { Controller, Get, Header } from "@nestjs/common";
import { SeoSystemService } from "./seo-system.service";

@Controller()
export class SeoSystemController {
  constructor(private readonly seoSystemService: SeoSystemService) {}

  @Get("robots.txt")
  @Header("Content-Type", "text/plain; charset=utf-8")
  robots(): string {
    return this.seoSystemService.generateRobotsTxt();
  }

  @Get("sitemap.xml")
  @Header("Content-Type", "application/xml; charset=utf-8")
  async sitemap(): Promise<string> {
    return this.seoSystemService.generateSitemapXml();
  }
}
