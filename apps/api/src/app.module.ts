import { BullModule } from '@nestjs/bullmq';
import {
  ExecutionContext,
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { Env, validateEnv } from './common/config/env.schema';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { FeaturesModule } from './features/features.module';
import { SharedModule } from './shared/shared.module';
import { RedisModule } from './common/redis/redis.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { join } from 'path';

function requestPathFromContext(context: ExecutionContext): string {
  const req = context.switchToHttp().getRequest<{ originalUrl?: string; url?: string }>();
  const raw = req.originalUrl ?? req.url ?? '';
  return raw.split('?')[0];
}

/** True when the HTTP path is under the auth controller (`/auth`, optional global prefix). */
function isAuthRoutePath(context: ExecutionContext): boolean {
  const path = requestPathFromContext(context);
  return path.includes('/auth/') || path.endsWith('/auth');
}

/** Matches `ThrottlerModule` `skipIf` checks (raw env string, not Zod-parsed config). */
function throttlingDisabled(): boolean {
  return process.env.THROTTLE_ENABLED === 'false';
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    JwtModule.register({ global: true }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 600,
        skipIf: (context: ExecutionContext) => throttlingDisabled() || isAuthRoutePath(context),
      },
      {
        name: 'auth',
        ttl: 60000,
        limit: 10,
        skipIf: (context: ExecutionContext) => throttlingDisabled() || !isAuthRoutePath(context),
      },
    ]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env>) => ({
        connection: {
          host: configService.get('REDIS_HOST', { infer: true }),
          port: configService.get('REDIS_PORT', { infer: true }),
        },
      }),
    }),
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env>) => {
        const port = configService.get('MAIL_PORT', { infer: true });

        return {
          transport: {
            host: configService.get('MAIL_HOST', { infer: true }),
            port: port,
            auth: configService.get('MAIL_USER', { infer: true })
              ? {
                  user: configService.get('MAIL_USER', { infer: true }),
                  pass: configService.get('MAIL_PASS', { infer: true }),
                }
              : undefined,
            secure: port === 465,
          },
          defaults: {
            from: `"Playr" <${configService.get('MAIL_FROM', { infer: true })}>`,
          },
          template: {
            dir: join(import.meta.dirname, 'templates'),
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
          options: {
            partials: {
              dir: join(import.meta.dirname, 'templates/partials'),
              options: {
                strict: true,
              },
            },
          },
        };
      },
    }),
    RedisModule,
    FeaturesModule,
    SharedModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
