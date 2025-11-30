import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreateAccountDto } from './dto/create-account.dto';
import { SignInDto } from './dto/sign-in.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AUTH_TYPE_ENUM } from '../enums';
import { User } from '../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async createAccount(
    dto: CreateAccountDto,
  ): Promise<Omit<User, 'passwordHash'>> {
    const provider = dto.provider ?? AUTH_TYPE_ENUM.LOCAL;

    if (!dto.acceptTerms) {
      throw new BadRequestException('You must accept the Terms to register');
    }

    if (provider === AUTH_TYPE_ENUM.LOCAL) {
      return this.handleLocalSignup(dto);
    }

    return this.handleProviderSignup(dto, provider);
  }

  private async handleLocalSignup(
    dto: CreateAccountDto,
  ): Promise<Omit<User, 'passwordHash'>> {
    const { email, password, name, photoUrl, companyName, role } = dto;

    if (!password) {
      throw new BadRequestException('Password is required');
    }

    const existing = await this.userRepo.findOne({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = this.userRepo.create({
      name,
      email: email.toLowerCase(),
      photoUrl: photoUrl ?? null,
      companyName: companyName ?? null,
      role: role ?? null,
      provider: AUTH_TYPE_ENUM.LOCAL,
      passwordHash,
      acceptTerms: !!dto.acceptTerms,
      isEmailVerified: false,
    });
    const saved = await this.userRepo.save(user);
    const { passwordHash: _, ...safe } = saved;
    return safe as Omit<User, 'passwordHash'>;
  }

  private async handleProviderSignup(
    dto: CreateAccountDto,
    provider: AUTH_TYPE_ENUM,
  ): Promise<Omit<User, 'passwordHash'>> {
    const { email, name, photoUrl, companyName, role } = dto;
    const lowerEmail = email.toLowerCase();
    let user = await this.userRepo.findOne({ where: { email: lowerEmail } });

    if (!user) {
      user = this.userRepo.create({
        name,
        email: lowerEmail,
        photoUrl: photoUrl ?? null,
        companyName: companyName ?? null,
        role: role ?? null,
        provider,
        passwordHash: null,
        acceptTerms: !!dto.acceptTerms,
        isEmailVerified: true,
      });
    } else {
      user.name = name;
      user.photoUrl = photoUrl ?? user.photoUrl ?? null;
      user.companyName = companyName ?? user.companyName ?? null;
      user.role = role ?? user.role ?? null;
      user.provider = provider;
      user.acceptTerms = !!dto.acceptTerms;
    }

    const saved = await this.userRepo.save(user);
    const { passwordHash: _, ...safe } = saved;
    return safe as Omit<User, 'passwordHash'>;
  }

  async login(signInDto: SignInDto): Promise<{ token: string }> {
    const { email, password } = signInDto;

    const user = await this.userRepo.findOne({
      where: {
        email: email.toLowerCase(),
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.provider !== AUTH_TYPE_ENUM.LOCAL) {
      throw new BadRequestException(
        `Please login with your ${user.provider} account`,
      );
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = await this.jwtService.signAsync(payload);

    return { token };
  }

  async forgottenPassword(): Promise<void> {}

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<void> {}

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {}
}
