import { Injectable, UnauthorizedException, ForbiddenException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { compare } from "bcryptjs";
import * as crypto from "crypto";
import { PrismaService } from "../../common/prisma/prisma.service";
import { LoginResponseDto } from "./dto/login-response.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  private generateRefreshToken(): string {
    return crypto.randomBytes(40).toString("hex");
  }

  private async createAuditLog(userId: string | undefined, action: string, status: string, metadata: Record<string, any> = {}) {
    await this.prismaService.auditLog.create({
      data: {
        userId,
        action,
        entityType: "Session",
        status,
        metadata,
      },
    });
  }

  async login(email: string, password: string, ipAddress: string, userAgent: string): Promise<LoginResponseDto> {
    const user = await this.prismaService.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      await this.createAuditLog(undefined, "LOGIN_ATTEMPT", "FAILED", { email, reason: "User not found", ipAddress });
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordMatches = await compare(password, user.passwordHash);
    if (!passwordMatches) {
      await this.createAuditLog(user.id, "LOGIN_ATTEMPT", "FAILED", { reason: "Invalid password", ipAddress });
      throw new UnauthorizedException("Invalid credentials");
    }

    const jwtSecret = this.configService.get<string>("JWT_SECRET");
    if (!jwtSecret) {
      throw new UnauthorizedException("JWT secret is not configured");
    }

    const expiresInSeconds = Number(
      this.configService.get<string>("JWT_EXPIRES_IN_SECONDS") ?? 900,
    ); // 15 mins
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role.name,
        fullName: user.fullName,
      },
      {
        secret: jwtSecret,
        expiresIn: expiresInSeconds,
      },
    );

    const refreshToken = this.generateRefreshToken();
    const tokenHash = this.hashToken(refreshToken);
    const refreshExpiresInDays = 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshExpiresInDays);

    await this.prismaService.session.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    await this.createAuditLog(user.id, "LOGIN", "SUCCESS", { ipAddress, userAgent });

    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresInSeconds,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role.name,
      },
    };
  }

  async refresh(refreshToken: string, ipAddress: string, userAgent: string): Promise<LoginResponseDto> {
    const tokenHash = this.hashToken(refreshToken);

    const session = await this.prismaService.session.findUnique({
      where: { tokenHash },
      include: { user: { include: { role: true } } },
    });

    if (!session || session.revokedAt || new Date() > session.expiresAt) {
      await this.createAuditLog(session?.userId, "REFRESH_ATTEMPT", "FAILED", { reason: "Invalid or expired session", ipAddress });
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const jwtSecret = this.configService.get<string>("JWT_SECRET");
    if (!jwtSecret) {
      throw new UnauthorizedException("JWT secret is not configured");
    }

    // Revoke old session to rotate
    await this.prismaService.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const expiresInSeconds = Number(this.configService.get<string>("JWT_EXPIRES_IN_SECONDS") ?? 900);
    const accessToken = await this.jwtService.signAsync(
      { sub: session.user.id, email: session.user.email, role: session.user.role.name, fullName: session.user.fullName },
      { secret: jwtSecret, expiresIn: expiresInSeconds }
    );

    const newRefreshToken = this.generateRefreshToken();
    const newTokenHash = this.hashToken(newRefreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prismaService.session.create({
      data: {
        userId: session.user.id,
        tokenHash: newTokenHash,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    await this.createAuditLog(session.user.id, "REFRESH", "SUCCESS", { ipAddress, oldSessionId: session.id });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      tokenType: "Bearer",
      expiresInSeconds,
      user: {
        id: session.user.id,
        email: session.user.email,
        fullName: session.user.fullName,
        role: session.user.role.name,
      },
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    const session = await this.prismaService.session.findUnique({ where: { tokenHash } });
    
    if (session) {
      await this.prismaService.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      await this.createAuditLog(session.userId, "LOGOUT", "SUCCESS", { sessionId: session.id });
    }
  }
}
