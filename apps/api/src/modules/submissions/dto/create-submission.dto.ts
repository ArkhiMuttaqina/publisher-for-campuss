import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateSubmissionDto {
  @IsString()
  submittedByUserId!: string;

  @IsString()
  @MinLength(3)
  title!: string;

  @IsOptional()
  @IsString()
  titleId?: string;

  @IsOptional()
  @IsString()
  titleEn?: string;

  @IsString()
  @MinLength(10)
  description!: string;

  @IsOptional()
  @IsString()
  descriptionId?: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;
}
