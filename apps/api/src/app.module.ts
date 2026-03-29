import { BullModule } from '@nestjs/bullmq';
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    JwtModule.register({ global: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 600,
        skipIf: () => process.env.THROTTLE_ENABLED === 'false',
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
            dir: join(__dirname, 'shared/mail/templates'),
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
          options: {
            partials: {
              dir: join(__dirname, 'shared/mail/templates/partials'),
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
