import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { catchError, mergeMap, Observable } from 'rxjs';
import { FinancialRequest } from './financial-auth';
import { FinancialService } from './financial.service';
@Injectable()
export class FinancialRequestInterceptor implements NestInterceptor {
  constructor(private readonly service: FinancialService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<FinancialRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const started = Date.now();
    response.setHeader('X-Request-Id', req.financial.requestId);
    const log = (status: number) =>
      this.service.log(
        req.financial,
        `${req.method} ${req.route?.path ?? ''}`,
        'application',
        { status, latencyMs: Date.now() - started },
      );
    return next.handle().pipe(
      mergeMap(async (data) => {
        await log(response.statusCode);
        return data;
      }),
      catchError(
        (error) =>
          new Observable((subscriber) => {
            const status =
              error && typeof error.getStatus === 'function'
                ? error.getStatus()
                : 500;
            log(status).then(
              () => subscriber.error(error),
              () => subscriber.error(error),
            );
          }),
      ),
    );
  }
}
