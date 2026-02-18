import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { ResponseInterceptor } from '../../../src/common/interceptors/response.interceptor';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<any>;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;
    interceptor = new ResponseInterceptor(reflector);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should intercept and format response', (done) => {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    const mockCallHandler: CallHandler = {
      handle: () => of('test-data'),
    };

    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(
      'Custom Message',
    );

    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result).toEqual({
        message: 'Custom Message',
        status: 'success',
        data: 'test-data',
      });
      done();
    });
  });

  it('should use default message if no metadata provided', (done) => {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    const mockCallHandler: CallHandler = {
      handle: () => of('test-data'),
    };

    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);

    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result).toEqual({
        message: 'Request successful',
        status: 'success',
        data: 'test-data',
      });
      done();
    });
  });
});
