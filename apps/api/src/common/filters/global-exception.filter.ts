import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import {
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_OPTIONS,
} from '@/features/auth/constants/cookie.constants';
import { createStandardizedResponse } from '../utils/response.helper';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly config: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    let errorMessage: string | object = 'Internal server error';

    if (typeof message === 'string') {
      errorMessage = message;
    } else if (typeof message === 'object' && message !== null) {
      const msgObj = message as Record<string, unknown>;
      errorMessage = (msgObj.message as string | object) || message;
    }

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception);
    }

    if (status === HttpStatus.UNAUTHORIZED && request.path?.endsWith('/auth/refresh')) {
      const baseOpts = {
        sameSite: REFRESH_TOKEN_COOKIE_OPTIONS.sameSite,
        secure: this.config.get('NODE_ENV') === 'production',
      };
      response.clearCookie(REFRESH_TOKEN_COOKIE_NAME, { ...baseOpts, path: '/' });
      response.clearCookie(REFRESH_TOKEN_COOKIE_NAME, { ...baseOpts, path: '/auth/refresh' });
    }

    const standardizedResponse = createStandardizedResponse({
      success: false,
      data: null,
      error: {
        statusCode: status,
        message: errorMessage,
      },
      request,
    });

    response.status(status).json(standardizedResponse);
  }
}
