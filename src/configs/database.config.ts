import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppDataSource } from '../data-source';

export default registerAs('database', (): TypeOrmModuleOptions => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    ...AppDataSource.options,
    synchronize: isDevelopment,
    autoLoadEntities: true,
  } as TypeOrmModuleOptions;
});
