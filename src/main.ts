/////////////////////////////////////////////////////////////////////////////////////
////////////////////// for local work
/////////////////////////////////////////////////////////////////////////////////////

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.use(helmet());

  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });

  // Attach Socket.IO adapter for WebSocket support
  app.useWebSocketAdapter(new IoAdapter(app));

  const config = new DocumentBuilder()
    .setTitle('Cats example')
    .setDescription('The cats API description')
    .setVersion('1.0')
    .addTag('cats')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

/////////////////////////////////////////////////////////////////////////////////////
////////////////////// to work on vercel
/////////////////////////////////////////////////////////////////////////////////////

// import { NestFactory } from '@nestjs/core';
// import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
// import { AppModule } from './app.module';
// import helmet from 'helmet';
// import { ValidationPipe } from '@nestjs/common';
// import cookieParser from 'cookie-parser';
// import { ExpressAdapter } from '@nestjs/platform-express';
// import express from 'express';

// const server = express();

// export const createNestServer = async (expressInstance) => {
//   const app = await NestFactory.create(
//     AppModule,
//     new ExpressAdapter(expressInstance),
//   );

//   app.use(cookieParser());
//   app.useGlobalPipes(
//     new ValidationPipe({
//       whitelist: true,
//       forbidNonWhitelisted: true,
//     }),
//   );
//   app.use(helmet());
//   app.enableCors({
//     origin: process.env.FRONTEND_URL,
//     credentials: true,
//   });

//   const config = new DocumentBuilder()
//     .setTitle('Cats example')
//     .setDescription('The cats API description')
//     .setVersion('1.0')
//     .addTag('cats')
//     .build();

//   const document = SwaggerModule.createDocument(app, config);
//   SwaggerModule.setup('api', app, document);

//   await app.init();
// };

// export default async (req: any, res: any) => {
//   await createNestServer(server);
//   server(req, res);
// };
