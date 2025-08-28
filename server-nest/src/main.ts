import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: false,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    const clientBuildPath = join(__dirname, '../../client/build');
    app.useStaticAssets(clientBuildPath);

    // Serve index.html for all routes (SPA support)
    app.use('*', (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      res.sendFile(join(clientBuildPath, 'index.html'));
    });
  }

  const port = process.env.PORT || 5000;
  const server = await app.listen(port);

  server.setTimeout(600000);
  (server as any).headersTimeout = 610000;
  (server as any).keepAliveTimeout = 65000;

  console.log(`🚀 Server running on port ${port}`);
  console.log(`📊 Stripe Connect Reporting API ready`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
}
bootstrap();
