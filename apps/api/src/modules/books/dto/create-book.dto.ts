import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Matches, Min, MinLength } from "class-validator";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateBookDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  @Matches(slugRegex)
  slug!: string;

  @IsString()
  @MinLength(20)
  summary!: string;

  @IsString()
  categoryId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1500)
  publicationYear!: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  authorIds!: string[];

  @IsOptional()
  @IsString()
  editionLabel?: string;

  @IsOptional()
  @IsString()
  isbn?: string;
}
