export class LoginResponseDto {
  accessToken!: string;
  refreshToken!: string;
  tokenType!: "Bearer";
  expiresInSeconds!: number;
  user!: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
}
