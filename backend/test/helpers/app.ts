import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { MailService } from '../../src/infra/mail/mail.service';

export type MailMock = {
  [K in keyof MailService]: jest.Mock;
};

export interface TestContext {
  app: NestExpressApplication;
  mail: MailMock;
}

/**
 * App giống main.ts (prefix, helmet, CORS, pipe, guard...), MailService được mock
 * để kiểm tra có gọi gửi email mà không cần SMTP.
 */
export async function createTestApp(): Promise<TestContext> {
  const mail: MailMock = {
    send: jest.fn().mockResolvedValue(undefined),
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
  };
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailService)
    .useValue(mail)
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({
    logger: ['error', 'warn'],
  });
  configureApp(app);
  await app.init();
  return { app, mail };
}
