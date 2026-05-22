import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AssetVisibility, MediaAsset } from "@prisma/client";
import { existsSync } from "node:fs";
import { extname, join } from "node:path";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateMediaAssetDto } from "./dto/create-media-asset.dto";
import { UpdateMediaAssetDto } from "./dto/update-media-asset.dto";

const MIME_BY_TYPE: Record<CreateMediaAssetDto["fileType"], string[]> = {
  cover: ["image/jpeg", "image/png", "image/webp"],
  blog_image: ["image/jpeg", "image/png", "image/webp"],
  full_pdf: ["application/pdf"],
  preview_pdf: ["application/pdf"],
};

const VISIBILITY_BY_FILE_TYPE: Record<
  CreateMediaAssetDto["fileType"],
  AssetVisibility
> = {
  cover: AssetVisibility.PUBLIC,
  blog_image: AssetVisibility.PUBLIC,
  full_pdf: AssetVisibility.PRIVATE,
  preview_pdf: AssetVisibility.PUBLIC,
};

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  private getPublicBaseUrl(): string {
    return process.env.MEDIA_PUBLIC_BASE_URL ?? "http://localhost:3000/media";
  }

  private getStorageDir(): string {
    return process.env.MEDIA_STORAGE_DIR ?? "uploads";
  }

  private getAbsoluteStoragePath(storageKey: string): string {
    return join(process.cwd(), this.getStorageDir(), storageKey);
  }

  private ensureAssetFileExists(storageKey: string): string {
    const absolutePath = this.getAbsoluteStoragePath(storageKey);
    if (!existsSync(absolutePath)) {
      throw new NotFoundException("Stored media file not found");
    }
    return absolutePath;
  }

  validateUploadPolicy(
    fileType: CreateMediaAssetDto["fileType"],
    mimeType: string,
  ): void {
    if (!MIME_BY_TYPE[fileType].includes(mimeType)) {
      throw new BadRequestException(
        `Invalid mime type ${mimeType} for ${fileType}`,
      );
    }
  }

  async createAssetFromUpload(
    file: Express.Multer.File,
    dto: CreateMediaAssetDto,
  ): Promise<MediaAsset> {
    this.validateUploadPolicy(dto.fileType, file.mimetype);

    const extension = extname(file.originalname) || ".bin";
    const fileNameHasExtension = extname(file.filename).length > 0;
    const normalizedDiskName = fileNameHasExtension
      ? file.filename
      : `${file.filename}${extension}`;
    const storageKey = normalizedDiskName;
    const visibility = dto.visibility
      ? toAssetVisibility(dto.visibility)
      : VISIBILITY_BY_FILE_TYPE[dto.fileType];
    const publicUrl = `${this.getPublicBaseUrl()}/${normalizedDiskName}`;

    const asset = await this.prisma.mediaAsset.create({
      data: {
        fileName: file.originalname,
        mimeType: file.mimetype,
        storageKey,
        publicUrl,
        sizeBytes: file.size,
        visibility,
        malwareScanStatus: "pending",
      },
    });

    if (dto.bookId && dto.fileType !== "blog_image") {
      await this.prisma.bookFile.create({
        data: {
          bookId: dto.bookId,
          fileType: dto.fileType,
          assetId: asset.id,
          visibility,
          isPreview: dto.fileType === "preview_pdf",
          locale: dto.locale,
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        action: "media.upload",
        entityType: "MediaAsset",
        entityId: asset.id,
        status: "success",
        metadata: {
          fileType: dto.fileType,
          visibility,
        },
      },
    });

    return asset;
  }

  findAll(): Promise<MediaAsset[]> {
    return this.prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" } });
  }

  async findOne(id: string): Promise<MediaAsset> {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });

    if (!asset) {
      throw new NotFoundException("Media asset not found");
    }

    return asset;
  }

  async findPublicPreviewByBook(bookId: string): Promise<MediaAsset> {
    const preview = await this.prisma.bookFile.findFirst({
      where: {
        bookId,
        isPreview: true,
        visibility: AssetVisibility.PUBLIC,
        book: {
          publications: {
            some: {
              isPublic: true,
              status: "PUBLISHED",
            },
          },
        },
      },
      include: {
        asset: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!preview) {
      throw new NotFoundException(
        "Public preview PDF is not available for this book",
      );
    }

    if (preview.asset.visibility !== AssetVisibility.PUBLIC) {
      throw new ForbiddenException("Preview is not public");
    }

    return preview.asset;
  }

  async getPublicPreviewFilePathByBook(bookId: string): Promise<string> {
    const previewAsset = await this.findPublicPreviewByBook(bookId);
    return this.ensureAssetFileExists(previewAsset.storageKey);
  }

  async getProtectedAssetFilePath(id: string): Promise<string> {
    const asset = await this.findOne(id);
    if (asset.visibility === AssetVisibility.PUBLIC) {
      return this.ensureAssetFileExists(asset.storageKey);
    }
    return this.ensureAssetFileExists(asset.storageKey);
  }

  async updateAsset(id: string, dto: UpdateMediaAssetDto): Promise<MediaAsset> {
    await this.findOne(id);

    const updated = await this.prisma.mediaAsset.update({
      where: { id },
      data: {
        fileName: dto.fileName,
        visibility: dto.visibility
          ? toAssetVisibility(dto.visibility)
          : undefined,
        malwareScanStatus: dto.malwareScanStatus,
        malwareScannedAt: dto.malwareScanStatus ? new Date() : undefined,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: "media.update",
        entityType: "MediaAsset",
        entityId: id,
        status: "success",
        metadata: {
          fileName: dto.fileName,
          visibility: dto.visibility,
          malwareScanStatus: dto.malwareScanStatus,
        },
      },
    });

    return updated;
  }

  async removeAsset(id: string): Promise<{ deleted: boolean; id: string }> {
    await this.findOne(id);

    await this.prisma.bookFile.deleteMany({ where: { assetId: id } });
    await this.prisma.mediaAsset.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        action: "media.delete",
        entityType: "MediaAsset",
        entityId: id,
        status: "success",
      },
    });

    return { deleted: true, id };
  }
}

function toAssetVisibility(
  input: "private" | "campus" | "public",
): AssetVisibility {
  if (input === "public") {
    return AssetVisibility.PUBLIC;
  }

  if (input === "campus") {
    return AssetVisibility.CAMPUS;
  }

  return AssetVisibility.PRIVATE;
}
