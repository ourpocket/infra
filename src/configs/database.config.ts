import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Wallet } from '../entities/wallet.entity';
import { Transfer } from '../entities/transfer.entity';
import { Project } from '../entities/project.entity';
import { ProjectAccount } from '../entities/project-account.entity';
import { ProjectApiKey } from '../entities/project-api-key.entity';
import { ProjectProvider } from '../entities/project-provider.entity';
import { PlatformAccount } from '../entities/platform-account.entity';
import { ApiKey } from '../entities/api-key.entity';
import { UserProvider } from '../entities/user-provider.entity';
import { Webhook } from '../entities/webhook.entity';
import { Payment } from '../entities/payment.entity';

export default registerAs('database', (): TypeOrmModuleOptions => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test';
  const isProduction = process.env.NODE_ENV === 'production';
  const useDatabaseUrl = Boolean(process.env.DATABASE_URL);

  // Explicitly list all entities to avoid circular reference issues
  const entities = [
    User,
    Wallet,
    Transfer,
    Project,
    ProjectAccount,
    ProjectApiKey,
    ProjectProvider,
    PlatformAccount,
    ApiKey,
    UserProvider,
    Webhook,
    Payment,
  ];

  const baseOptions: Partial<TypeOrmModuleOptions> = {
    type: 'postgres',
    entities,
    synchronize: isDevelopment || isTest,
    logging: isDevelopment || isTest,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    autoLoadEntities: true,
  };

  if (useDatabaseUrl) {
    return {
      ...baseOptions,
      url: process.env.DATABASE_URL,
    } as TypeOrmModuleOptions;
  }

  return {
    ...baseOptions,
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  } as TypeOrmModuleOptions;
});
