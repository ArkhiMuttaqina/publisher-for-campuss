import { Type } from "class-transformer";
import { ArrayUnique, IsArray, IsOptional, IsString, Matches, MinLength } from "class-validator";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateBlogPostDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @Matches(slugRegex)
  slug!: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  blogCategoryId?: string;

  @IsOptional()
  @IsString()
  bookCategoryId?: string;

  @IsString()
  authorName!: string;

  @IsOptional()
  @Type(() => Array)
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  relatedBookIds?: string[];
}
