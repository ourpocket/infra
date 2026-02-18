import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

jest.mock('@nestjs/core', () => ({
  NestFactory: { create: jest.fn() },
}));

jest.mock('../src/common/interceptors/response.interceptor', () => ({
  ResponseInterceptor: jest.fn(),
}));

jest.mock('@nestjs/swagger', () => {
  const actual = jest.requireActual('@nestjs/swagger');

  const builderMock = {
    setTitle: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setVersion: jest.fn().mockReturnThis(),
    addTag: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({}),
  };

  return {
    ...actual,
    DocumentBuilder: jest.fn(() => builderMock),
    SwaggerModule: {
      ...actual.SwaggerModule,
      createDocument: jest.fn().mockReturnValue({}),
      setup: jest.fn(),
    },
  };
});

describe('main bootstrap', () => {
  it('should bootstrap application and listen on a port', async () => {
    const appMock = {
      enableCors: jest.fn(),
      enableVersioning: jest.fn(),
      useGlobalInterceptors: jest.fn(),
      get: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    } as any;

    (NestFactory.create as jest.Mock).mockResolvedValue(appMock);

    await import('../src/main');

    expect((NestFactory as any).create).toHaveBeenCalledWith(AppModule);
    expect(appMock.enableCors).toHaveBeenCalledWith({ origin: '*' });
    expect(appMock.enableVersioning).toHaveBeenCalled();
    expect(appMock.useGlobalInterceptors).toHaveBeenCalledWith(
      expect.any(ResponseInterceptor),
    );
    expect(appMock.listen).toHaveBeenCalledWith(expect.anything());
  });
});
