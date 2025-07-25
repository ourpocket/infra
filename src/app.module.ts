import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';

const TypeORMConfigModule = TypeOrmModule.forRoot({
  type: 'postgres',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: 'root',
  database: 'test',
  entities: [],
  synchronize: process.env.NODE_ENV === 'development',
});

@Module({
  imports: [AuthModule, UserModule , TypeORMConfigModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
