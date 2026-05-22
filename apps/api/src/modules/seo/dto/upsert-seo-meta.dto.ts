import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from "class-validator";

export class UpsertSeoMetaDto {
  @IsString()
  @MinLength(10)
  @MaxLength(70)
  metaTitle!: string;

  @IsString()
  @MinLength(50)
  @MaxLength(160)
  metaDescription!: string;

  @IsOptional()
  @IsUrl()
  canonicalUrl?: string;

  @IsOptional()
  @IsUrl()
  ogImageUrl?: string;

  @IsOptional()
  @IsString()
  bookId?: string;

  @IsOptional()
  @IsString()
  blogPostId?: string;
}
