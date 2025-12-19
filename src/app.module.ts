import { Module } from '@nestjs/common';
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
import { MailService } from './mail/mail.service';
import { MailModule } from './mail/mail.module';

const TypeORMConfigModule = TypeOrmModule.forRootAsync({
  imports: [NestConfigModule],
  useFactory: (configService: ConfigService) => configService.get('database')!,
  inject: [ConfigService],
});

@Module({
  imports: [
    NestConfigModule.forRoot(),
    TypeORMConfigModule,
    ConfigModule,
    AuthModule,
    UserModule,
    ApiKeyModule,
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
  providers: [AppService, MailService],
})
export class AppModule {}
