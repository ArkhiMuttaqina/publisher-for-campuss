import { IsOptional, IsString, Matches, MinLength } from "class-validator";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateCategoryDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @Matches(slugRegex)
  slug!: string;

  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
