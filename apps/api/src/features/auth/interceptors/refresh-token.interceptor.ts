import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response as ExpressResponse } from 'express';
import { map } from 'rxjs/operators';
import {
    REFRESH_TOKEN_COOKIE_NAME,
    REFRESH_TOKEN_COOKIE_OPTIONS,
} from '../constants/cookie.constants';

@Injectable()
export class RefreshTokenInterceptor implements NestInterceptor {
  constructor(private readonly config: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const response = context.switchToHttp().getResponse<ExpressResponse>();

    return next.handle().pipe(
      map((data) => {
        if (data && data.refreshToken) {
          const { refreshToken, ...rest } = data;

          response.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
            ...REFRESH_TOKEN_COOKIE_OPTIONS,
            secure: this.config.get('NODE_ENV') === 'production',
          });

          // Return data without the refreshToken to prevent it from reaching the client body
          return rest;
        }
        return data;
      }),
    );
  }
}
