import { FinancialModule } from './financial/financial.module';
import { Module } from '@nestjs/common';
import { WalletProviderModule } from './wallet-provider/wallet-provider.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from './configs/config.module';
import {
  ConfigModule as NestConfigModule,
  ConfigService,
} from '@nestjs/config';
import { ApiKeyModule } from './api-key/api-key.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { MailController } from './mail/mail.controller';
import { MailModule } from './mail/mail.module';
import { UserProviderModule } from './user-provider/user-provider.module';
import { ProjectModule } from './project/project.module';
import { WalletsModule } from './wallets/wallets.module';
import { TransactionsModule } from './transactions/transactions.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { UsageModule } from './usage/usage.module';
import { ProviderCatalogModule } from './provider-catalog/provider-catalog.module';

const TypeORMConfigModule = TypeOrmModule.forRootAsync({
  imports: [NestConfigModule],
  useFactory: (configService: ConfigService) =>
    configService.getOrThrow('database'),
  inject: [ConfigService],
});

@Module({
  imports: [
    ConfigModule,
    TypeORMConfigModule,
    WalletProviderModule,
    AuthModule,
    UserModule,
    ApiKeyModule,
    UserProviderModule,
    ProjectModule,
    FinancialModule,
    WalletsModule,
    TransactionsModule,
    WebhooksModule,
    UsageModule,
    ProviderCatalogModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60,
          limit: 10,
        },
      ],
    }),
    ScheduleModule.forRoot(),
    MailModule,
  ],
  controllers: [AppController, MailController],
  providers: [AppService],
})
export class AppModule {}
