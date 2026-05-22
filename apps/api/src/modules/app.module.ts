import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../common/prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { AuthorsModule } from "./authors/authors.module";
import { BlogModule } from "./blog/blog.module";
import { BooksModule } from "./books/books.module";
import { CategoriesModule } from "./categories/categories.module";
import { HealthModule } from "./health/health.module";
import { MediaModule } from "./media/media.module";
import { SeoModule } from "./seo/seo.module";
import { SeoSystemModule } from "./seo-system/seo-system.module";
import { SubmissionsModule } from "./submissions/submissions.module";
import { UsersModule } from "./users/users.module";

import { APP_GUARD } from "@nestjs/core";
import { SimpleRateLimitGuard } from "../common/security/simple-rate-limit.guard";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["apps/api/.env", ".env"],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    CategoriesModule,
    AuthorsModule,
    BooksModule,
    BlogModule,
    SeoModule,
    MediaModule,
    SeoSystemModule,
    SubmissionsModule,
    UsersModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: SimpleRateLimitGuard,
    },
  ],
})
export class AppModule {}
