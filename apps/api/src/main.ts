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

  const environment = process.env.NODE_ENV || 'dev';

  if (environment === 'dev') {
    app.enableCors({
      origin: '*',
    });
  }

  await app.listen(process.env.PORT ? parseInt(process.env.PORT, 10) : 8000);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
