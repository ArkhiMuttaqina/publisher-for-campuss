import { IsOptional, IsString, Matches, MinLength, IsUrl } from "class-validator";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateAuthorDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @Matches(slugRegex)
  slug!: string;

  @IsOptional()
  @IsString()
  biography?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
