import { Injectable, NotFoundException } from "@nestjs/common";
import { Role, User } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";

type UserWithRole = User & { role: Role };

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<UserWithRole[]> {
    return this.prisma.user.findMany({
      include: { role: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateUserRole(
    userId: string,
    roleName: string,
  ): Promise<UserWithRole> {
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });
    if (!role) {
      throw new NotFoundException(`Role '${roleName}' not found`);
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existingUser) {
      throw new NotFoundException("User not found");
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { roleId: role.id },
      include: { role: true },
    });
  }
}
