import { Module } from "@nestjs/common";
import { SeoSystemController } from "./seo-system.controller";
import { SeoSystemService } from "./seo-system.service";

@Module({
  controllers: [SeoSystemController],
  providers: [SeoSystemService]
})
export class SeoSystemModule {}
