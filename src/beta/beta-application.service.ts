import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BetaApplication } from '../entities/beta-application.entity';
import { CreateBetaApplicationDto } from './beta-application.dto';

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('driverError' in error))
    return false;
  const driverError = error.driverError;
  return (
    !!driverError &&
    typeof driverError === 'object' &&
    'code' in driverError &&
    driverError.code === '23505'
  );
}

@Injectable()
export class BetaApplicationService {
  constructor(
    @InjectRepository(BetaApplication)
    private readonly applications: Repository<BetaApplication>,
  ) {}

  async apply(dto: CreateBetaApplicationDto): Promise<{ status: 'received' }> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.applications.findOne({ where: { email } });
    if (existing) return { status: 'received' };

    try {
      await this.applications.save(
        this.applications.create({
          email,
          companyName: dto.companyName?.trim() || null,
          useCase: dto.useCase,
        }),
      );
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
    return { status: 'received' };
  }
}
