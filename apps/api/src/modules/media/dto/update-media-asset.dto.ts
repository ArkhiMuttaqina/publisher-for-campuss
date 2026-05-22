import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateMediaAssetDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @IsOptional()
  @IsIn(["private", "campus", "public"])
  visibility?: "private" | "campus" | "public";

  @IsOptional()
  @IsIn(["pending", "clean", "infected"])
  malwareScanStatus?: "pending" | "clean" | "infected";
}
