import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { Role, User } from "@prisma/client";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";
import { UsersService } from "./users.service";

type UserWithRole = User & { role: Role };

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("super_admin", "publisher_admin")
  @Get()
  findAll(): Promise<UserWithRole[]> {
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("super_admin")
  @Patch(":id/role")
  updateRole(
    @Param("id") id: string,
    @Body() body: UpdateUserRoleDto,
  ): Promise<UserWithRole> {
    return this.usersService.updateUserRole(id, body.roleName);
  }
}
