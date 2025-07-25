import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AuthService } from './auth.service';
import {CreateAccountDto} from "./dto/create-account.dto";
import {SignInDto} from "./dto/sign-in.dto";
import {VerifyEmailDto} from "./dto/verify-email.dto";
import {ResetPasswordDto} from "./dto/reset-password.dto";

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  createAccount( @Body() createAccountDto: CreateAccountDto ) {
    return this.authService.createAccount(createAccountDto);
  }

  @Post('login')
  signIn( @Body() signInDto: SignInDto){
    return this.authService.signIn(signInDto)
  }

  @Post('verify-email')
  verifyEmail(@Body() verifyEmailDto: VerifyEmailDto){
      return this.authService.verifyEmail(verifyEmailDto)
  }

  resetPassword( @Body() resetPasswordDto: ResetPasswordDto) {
    this.authService.resetPassword(resetPasswordDto)
  }

}
