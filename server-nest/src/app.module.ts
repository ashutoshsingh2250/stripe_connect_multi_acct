import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './controllers/auth.controller';
import { ReportsController } from './controllers/reports.controller';
import { ExportController } from './controllers/export.controller';
import { StripeService } from './services/stripe.service';
import { EmailService } from './services/email.service';
import { ExportService } from './services/export.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'stripe-connect-jwt-secret-2025',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [
    AppController,
    AuthController,
    ReportsController,
    ExportController,
  ],
  providers: [
    AppService,
    StripeService,
    EmailService,
    ExportService,
    JwtAuthGuard,
  ],
})
export class AppModule {}
