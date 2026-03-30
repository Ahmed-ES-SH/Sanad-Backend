import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from 'src/user/schema/user.schema';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { sendResetPasswordDTO } from './dto/send-rest-password.dto';
import { verifyRestTokenDTO } from './dto/verify-rest-password-token.dto';

import type { Request, Response } from 'express';

/**
 * Controller responsible for handling authentication-related requests.
 * Includes Login, Email Verification, Password Reset, and Google OAuth.
 */
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Authenticates a user and returns a JWT token.
   * @param dto - Login credentials (email and password).
   */
  @Post('login')
  normalLogin(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * Retrieves the profile of the currently authenticated user.
   * @param req - The request object containing the user attached by JwtAuthGuard.
   */
  @UseGuards(JwtAuthGuard)
  @Get('current-user')
  getProfile(@Req() req: Response & { user: User }) {
    return req.user;
  }

  /**
   * Verifies user email via a unique token.
   * @param token - The verification token sent to the user's email.
   */
  @Post('verify-email')
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  /**
   * Sends a password reset link to the user's registered email.
   */
  @Post('rest-password/send')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 900000 } })
  async sendRestPassword(@Body() dto: sendResetPasswordDTO) {
    return this.authService.sendRestPassword(dto);
  }

  /**
   * Validates the password reset token before allowing password change.
   */
  @Post('rest-password/verify')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  async verifyRestPasswordToken(@Body() dto: verifyRestTokenDTO) {
    return this.authService.verifyRestToken(dto);
  }

  /**
   * Resets the user's password using the verified token.
   */
  @Post('rest-password')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  async RestPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.restPassword(dto);
  }

  /**
   * Initiates the Google OAuth2 login flow.
   */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  /**
   * Handles the callback from Google OAuth2.
   */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleAuthRedirect(@Req() req: Request) {
    return req.user;
  }
}
