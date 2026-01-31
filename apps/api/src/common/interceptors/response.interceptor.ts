import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BYPASS_RESPONSE_INTERCEPTOR_KEY } from '../decorators/bypass-interceptor.decorator';
import { WithMeta } from '../utils/with-meta.util';

export interface StandardizedResponse<T> {
  success: boolean;
  data: T | null;
  error: null;
  meta: {
    timestamp: string;
    requestId: string;
    path: string;
    [key: string]: any;
  };
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, StandardizedResponse<T>> {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<StandardizedResponse<T>> {
    const bypass = this.reflector.get<boolean>(
      BYPASS_RESPONSE_INTERCEPTOR_KEY,
      context.getHandler(),
    );

    if (bypass) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const requestId = request.id || request.headers['x-request-id'] || this.generateRequestId();

    return next.handle().pipe(
      map((res: unknown): StandardizedResponse<T> => {
        let data = res;
        let extraMeta = {};

        if (res instanceof WithMeta) {
          data = res.data;
          extraMeta = res.meta;
        }

        return {
          success: true,
          data: (data as T) ?? null,
          error: null,
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
            path: request.url,
            ...extraMeta,
          },
        };
      }),
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
