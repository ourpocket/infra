import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const useDatabaseUrl = Boolean(process.env.DATABASE_URL);

const baseOptions: Partial<DataSourceOptions> = {
  type: 'postgres',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
  synchronize: false,
  logging: isDevelopment,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
};

let options: DataSourceOptions;

if (useDatabaseUrl) {
  options = {
    ...baseOptions,
    url: process.env.DATABASE_URL,
  } as DataSourceOptions;
} else {
  options = {
    ...baseOptions,
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  } as DataSourceOptions;
}

export const AppDataSource = new DataSource(options);
