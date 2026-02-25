import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { Controller, UseGuards } from '@nestjs/common';

@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {}
