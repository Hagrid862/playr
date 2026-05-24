import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { cleanupOpenApiDoc, ZodValidationPipe } from 'nestjs-zod';
import 'reflect-metadata';
import { AppModule } from './app.module';
import { getCorsOrigin } from './common/config/cors-config';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import * as qs from 'qs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  app
    .getHttpAdapter()
    .getInstance()
    .set('query parser', (str: string) => {
      return qs.parse(str, { allowDots: true });
    });

  app.use(cookieParser());
  app.useGlobalFilters(new GlobalExceptionFilter(app.get(ConfigService)));
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));

  app.useGlobalPipes(new ZodValidationPipe());

  const prefix = process.env.API_PREFIX;
  if (prefix) app.setGlobalPrefix(prefix);

  const config = new DocumentBuilder()
    .setTitle('Playr API')
    .setDescription('The Playr Backend API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, cleanupOpenApiDoc(document));

  const corsOrigin = getCorsOrigin();
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    exposedHeaders: [
      'Content-Range',
      'Accept-Ranges',
      'Content-Length',
      'X-Content-Quality',
      'X-Content-Format',
    ],
  });

  await app.listen(process.env.PORT ? parseInt(process.env.PORT, 10) : 8000);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
