import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { LoginDto, LoginResponseDto } from '../dto/auth.dto';

@Controller('api/auth')
export class AuthController {
  constructor(private jwtService: JwtService) {}

  private readonly users = [
    { username: 'admin', password: 'admin123' },
    { username: 'user', password: 'password' },
  ];

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    const { username, password } = loginDto;

    const user = this.users.find(
      (u) => u.username === username && u.password === password,
    );

    if (!user) {
      throw new Error('Invalid username or password');
    }

    const jwtSecret =
      process.env['JWT_SECRET'] || 'stripe-connect-jwt-secret-2025';
    const token = this.jwtService.sign(
      {
        username: username,
        authenticated: true,
        iat: Math.floor(Date.now() / 1000),
      },
      { secret: jwtSecret, expiresIn: '24h' },
    );

    return {
      message: 'Login successful',
      user: { username, authenticated: true },
      token: token,
    };
  }

  @Post('logout')
  async logout(): Promise<{ message: string }> {
    return { message: 'Logout successful' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(
    @Request() req,
  ): Promise<{ authenticated: boolean; user: { username: string } }> {
    return {
      authenticated: true,
      user: { username: req.user.username },
    };
  }
}
