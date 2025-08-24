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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
