import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestFactory, Reflector } from '@nestjs/core';

jest.mock('../src/app.module');
jest.mock('@nestjs/core', () => ({
  NestFactory: { create: jest.fn() },
  Reflector: jest.fn(),
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

describe.skip('main bootstrap', () => {
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should bootstrap application and listen on a port', async () => {
    await Promise.resolve();
    const appMock = {
      enableCors: jest.fn(),
      enableVersioning: jest.fn(),
      useGlobalInterceptors: jest.fn(),
      get: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    } as any;

    (NestFactory.create as jest.Mock).mockResolvedValue(appMock);

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../src/main');
    });

    // Wait for async bootstrap to proceed
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect((NestFactory as any).create).toHaveBeenCalledWith(AppModule);
    expect(appMock.enableCors).toHaveBeenCalledWith({ origin: '*' });
    expect(appMock.enableVersioning).toHaveBeenCalled();
    expect(appMock.useGlobalInterceptors).toHaveBeenCalledWith(
      expect.any(ResponseInterceptor),
    );
    expect(appMock.listen).toHaveBeenCalledWith(expect.anything());
  });
});
