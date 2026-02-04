import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { ZodValidationPipe } from 'nestjs-zod';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));

  app.useGlobalPipes(new ZodValidationPipe());

  const prefix = process.env.API_PREFIX;
  if (prefix) app.setGlobalPrefix(prefix);

  const config = new DocumentBuilder()
    .setTitle('Playr API')
    .setDescription('The Playr Backend API description')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const env = process.env.NODE_ENV || 'development';
  const isProduction = env === 'production' || env === 'prod';

  if (!isProduction) {
    app.enableCors({
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });
  } else {
    const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || [];
    app.enableCors({
      origin: allowedOrigins,
      credentials: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });
  }

  await app.listen(process.env.PORT ? parseInt(process.env.PORT, 10) : 8000);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
