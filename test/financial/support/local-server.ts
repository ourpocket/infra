/** Disposable local app for SDK and browser acceptance checks. Never points at a production database. */
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Reflector } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { userInfo } from 'node:os';
import * as bcrypt from 'bcrypt';
import { FinancialModule } from '../../../src/financial/financial.module';
import { AuthModule } from '../../../src/auth/auth.module';
import { User } from '../../../src/entities/user.entity';
import { ResponseInterceptor } from '../../../src/common/interceptors/response.interceptor';
import { MailService } from '../../../src/mail/mail.service';
async function main() {
  const database = process.env.TEST_DATABASE_NAME;
  if (!database?.startsWith('ourpocket_mvp_test_'))
    throw new Error('A disposable ourpocket_mvp_test_* database is required');
  process.env.PROVIDER_CONFIG_ENCRYPTION_KEY = 'local-test-encryption-only';
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [
          () => ({ jwt: { secret: 'local-test-jwt-only', expiresIn: '1d' } }),
        ],
      }),
      TypeOrmModule.forRoot({
        type: 'postgres',
        host: '/tmp',
        username: userInfo().username,
        database,
        entities: [__dirname + '/../../../src/**/*.entity.ts'],
        synchronize: false,
      }),
      ScheduleModule.forRoot(),
      FinancialModule,
      AuthModule,
    ],
  })
    .overrideProvider(MailService)
    .useValue({
      sendWelcomeEmail: () => Promise.resolve(undefined),
      sendVerificationEmail: () => Promise.resolve(undefined),
    })
    .compile();
  const app = module.createNestApplication({ rawBody: true });
  app.enableCors();
  app.enableVersioning({ type: VersioningType.URI });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
  await app.get(DataSource).manager.update(
    User,
    { email: 'mvp@example.test' },
    {
      passwordHash: await bcrypt.hash('LocalSandbox123!', 12),
      isEmailVerified: true,
    },
  );
  await app.listen(Number(process.env.TEST_PORT ?? 3108), '127.0.0.1');
  console.log(
    'Disposable local API is ready on port 3108. Test login: mvp@example.test / LocalSandbox123!',
  );
  const stop = async () => {
    await app.close();
    process.exit(0);
  };
  process.once('SIGINT', () => void stop());
  process.once('SIGTERM', () => void stop());
}
void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
