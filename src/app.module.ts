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

const TypeORMConfigModule = TypeOrmModule.forRootAsync({
  imports: [NestConfigModule],
  useFactory: (configService: ConfigService) => configService.get('database')!,
  inject: [ConfigService],
});

@Module({
  imports: [
    WalletProviderModule,
    AuthModule,
    UserModule,
    ApiKeyModule,
    UserProviderModule,
    ProjectModule,
    WalletsModule,
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
    TypeORMConfigModule,
    ConfigModule,
  ],
  controllers: [AppController, MailController],
  providers: [AppService],
})
export class AppModule {}
