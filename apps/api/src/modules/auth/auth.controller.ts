import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { Request } from "express";
import { Public } from "../../common/auth/public.decorator";
import { AuthenticatedUser } from "../../common/auth/authenticated-user.type";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { LoginResponseDto } from "./dto/login-response.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { LogoutDto } from "./dto/logout.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  login(@Req() request: Request, @Body() body: LoginDto): Promise<LoginResponseDto> {
    const ip = request.ip || 'unknown';
    const userAgent = request.headers['user-agent'] || 'unknown';
    return this.authService.login(body.email, body.password, ip, userAgent);
  }

  @Public()
  @Post("refresh")
  refresh(@Req() request: Request, @Body() body: RefreshDto): Promise<LoginResponseDto> {
    const ip = request.ip || 'unknown';
    const userAgent = request.headers['user-agent'] || 'unknown';
    return this.authService.refresh(body.refreshToken, ip, userAgent);
  }

  @Post("logout")
  async logout(@Body() body: LogoutDto): Promise<{ success: boolean }> {
    await this.authService.logout(body.refreshToken);
    return { success: true };
  }

  @Get("me")
  me(@Req() request: { user: AuthenticatedUser }): {
    id: string;
    email: string;
    role: string;
    fullName: string;
  } {
    return {
      id: request.user.userId,
      email: request.user.email,
      role: request.user.role,
      fullName: request.user.fullName,
    };
  }
}
