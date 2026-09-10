import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 1. Tạo config với DocumentBuilder
  const config = new DocumentBuilder()
    .setTitle('EduMap AI Backend API')
    .setDescription('Hệ thống API cho nền tảng định hướng lộ trình học IT')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  // 2. CHÚ Ý: Truyền app làm tham số thứ 1, config làm tham số thứ 2
  const document = SwaggerModule.createDocument(app, config);

  // 3. Setup đường dẫn Swagger UI
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application running on: http://localhost:${port}`);
  console.log(`Swagger UI: http://localhost:${port}/api/docs`);
}
bootstrap();
