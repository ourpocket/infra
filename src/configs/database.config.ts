import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs('database', (): TypeOrmModuleOptions => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';
  const useDatabaseUrl = Boolean(process.env.DATABASE_URL);

  const baseOptions: Partial<TypeOrmModuleOptions> = {
    type: 'postgres',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: isDevelopment,
    logging: isDevelopment,
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
