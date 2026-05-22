import { IsIn, IsOptional, IsString } from "class-validator";

export class CreateMediaAssetDto {
  @IsIn(["cover", "full_pdf", "preview_pdf", "blog_image"])
  fileType!: "cover" | "full_pdf" | "preview_pdf" | "blog_image";

  @IsOptional()
  @IsString()
  bookId?: string;

  @IsOptional()
  @IsIn(["private", "campus", "public"])
  visibility?: "private" | "campus" | "public";

  @IsOptional()
  @IsIn(["id", "en"])
  locale?: "id" | "en";
}
