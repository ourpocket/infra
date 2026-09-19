import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { DataSource, LessThan } from 'typeorm';
import { FinancialLog } from './financial.entity';
@Injectable()
export class FinancialRetentionService {
  constructor(private readonly db: DataSource) {}
  @Interval(3600000)
  async cleanLogs() {
    await this.db.manager.delete(FinancialLog, {
      createdAt: LessThan(new Date(Date.now() - 7 * 86400000)),
    });
  }
}
