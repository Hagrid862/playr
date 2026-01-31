import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BYPASS_RESPONSE_INTERCEPTOR_KEY } from '../decorators/bypass-interceptor.decorator';
import { WithMeta } from '../utils/with-meta.util';
import { createStandardizedResponse, StandardizedResponse } from '../utils/response.helper';

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
    return next.handle().pipe(
      map((res: unknown): StandardizedResponse<T> => {
        let data = res;
        let extraMeta = {};

        if (res instanceof WithMeta) {
          data = res.data;
          extraMeta = res.meta;
        }

        return createStandardizedResponse({
          data: (data as T) ?? null,
          request,
          extraMeta,
        });
      }),
    );
  }
}
