import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Patch,
  Param,
  ParseFilePipe,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { Request } from "express";
import { createReadStream } from "node:fs";
import { FileInterceptor } from "@nestjs/platform-express";
import { MediaAsset } from "@prisma/client";
import { diskStorage } from "multer";
import { extname } from "node:path";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import { Public } from "../../common/auth/public.decorator";
import { CreateMediaAssetDto } from "./dto/create-media-asset.dto";
import { MediaService } from "./media.service";
import { UpdateMediaAssetDto } from "./dto/update-media-asset.dto";

function uploadDir(): string {
  return process.env.MEDIA_STORAGE_DIR ?? "uploads";
}

@Controller("media")
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  findAll(): Promise<MediaAsset[]> {
    return this.mediaService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string): Promise<MediaAsset> {
    return this.mediaService.findOne(id);
  }

  @Public()
  @Get("public/books/:bookId/preview")
  findPublicPreviewByBook(
    @Param("bookId") bookId: string,
  ): Promise<MediaAsset> {
    return this.mediaService.findPublicPreviewByBook(bookId);
  }

  @Public()
  @Get("public/books/:bookId/preview/file")
  @Header("Content-Type", "application/pdf")
  async publicPreviewFile(
    @Param("bookId") bookId: string,
  ): Promise<StreamableFile> {
    const absolutePath =
      await this.mediaService.getPublicPreviewFilePathByBook(bookId);
    return new StreamableFile(createReadStream(absolutePath));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("super_admin", "editor", "catalog_manager")
  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: uploadDir(),
        filename: (
          _req: Request,
          file: Express.Multer.File,
          cb: (error: Error | null, filename: string) => void,
        ) => {
          const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: {
        fileSize: 20 * 1024 * 1024,
      },
    }),
  )
  upload(
    @UploadedFile(new ParseFilePipe({ fileIsRequired: true }))
    file: Express.Multer.File,
    @Body() body: CreateMediaAssetDto,
  ): Promise<MediaAsset> {
    return this.mediaService.createAssetFromUpload(file, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("super_admin", "editor", "catalog_manager")
  @Patch(":id")
  updateAsset(
    @Param("id") id: string,
    @Body() body: UpdateMediaAssetDto,
  ): Promise<MediaAsset> {
    return this.mediaService.updateAsset(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("super_admin", "editor")
  @Delete(":id")
  removeAsset(
    @Param("id") id: string,
  ): Promise<{ deleted: boolean; id: string }> {
    return this.mediaService.removeAsset(id);
  }

  @Get("secure/:id")
  async secureAssetFile(@Param("id") id: string): Promise<StreamableFile> {
    const absolutePath = await this.mediaService.getProtectedAssetFilePath(id);
    return new StreamableFile(createReadStream(absolutePath));
  }
}
