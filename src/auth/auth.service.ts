import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  async createAccount(/* createAuthDto: CreateAccountDto */): Promise<void> {}

  async signIn(/* signInDto: SignInDto */): Promise<void> {}

  async forgottenPassword(): Promise<void> {}

  async verifyEmail(/* verifyEmailDto: VerifyEmailDto */): Promise<void> {}

  async resetPassword(/* resetPasswordDto: ResetPasswordDto */): Promise<void> {}
}
