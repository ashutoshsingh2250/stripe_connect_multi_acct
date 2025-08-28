import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return server status message', () => {
      expect(appController.getRoot()).toEqual({
        message: 'Stripe Connect Reporting API - Server is running',
      });
    });
  });

  describe('api', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getApiHello()).toBe('Hello World!');
    });
  });
});
