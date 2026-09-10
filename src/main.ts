import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { TransformInterceptor } from './common/interceptors/transform.interceptor'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // CORS
  app.enableCors()

  // Global API prefix
  app.setGlobalPrefix('api/v1')

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  // Bật Global Filter & Interceptor
  app.useGlobalFilters(new HttpExceptionFilter())
  app.useGlobalInterceptors(new TransformInterceptor())

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('EduMap AI Backend API')
    .setDescription('Hệ thống API cho nền tảng định hướng lộ trình học IT')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)

  SwaggerModule.setup('api/docs', app, document)

  // Start server
  const port = process.env.PORT || 3000

  await app.listen(port)

  console.log(`Application running on: http://localhost:${port}`)
  console.log(`Swagger UI: http://localhost:${port}/api/docs`)
}

bootstrap()
