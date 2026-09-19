import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class SchemaReadinessService implements OnModuleInit {
  private ready = false;

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    if (
      process.env.NODE_ENV === 'production' &&
      (await this.dataSource.showMigrations())
    )
      throw new Error(
        'Database schema is behind this release. Run the dedicated migration job before starting the API.',
      );
    this.ready = true;
  }

  isReady(): boolean {
    return this.ready;
  }
}
