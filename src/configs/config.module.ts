import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import databaseConfig from './database.config';
import jwtConfig from './jwt.config';
import redisConfig from './redis.config';
import appConfig from './app.config';
import { validateEnvironment } from './env.validation';
import { resolveEnvironmentFile } from './env-file';

const environmentFile = resolveEnvironmentFile(__dirname);

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, redisConfig, appConfig],
      envFilePath: environmentFile,
      validate: validateEnvironment,
    }),
  ],
})
export class ConfigModule {}
