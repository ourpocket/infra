import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*',
  });

  const config = new DocumentBuilder()
    .setTitle('Our Pocket API')
    .setDescription('Our Pocket API')
    .setVersion('1.0')
    .addTag('ourpocket')
    .build();

  const documentFactory = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-doc', app, documentFactory);

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1'
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
