import { IsString } from "class-validator";

export class UpdateUserRoleDto {
  @IsString()
  roleName!: string;
}
