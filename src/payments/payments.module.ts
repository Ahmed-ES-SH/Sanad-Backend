import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './schema/payment.schema';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentsClientController } from './payments.client.controller';
import { PaymentsWebhookController } from './payments.webhook.controller';
import { ConfigModule } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import { StripeModule } from 'src/stripe/stripe.module';
import { AuthModule } from 'src/auth/auth.module';
import { AuthGuard } from 'src/auth/guards/auth.guard';

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
    ConfigModule,
    StripeModule,
    AuthModule,
  ],
  controllers: [
    PaymentsController,
    PaymentsClientController,
    PaymentsWebhookController,
  ],
  providers: [PaymentsService, AuthGuard],
})
export class PaymentsModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply((req: RawBodyRequest, _res: Response, next: NextFunction) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => {
          req.rawBody = Buffer.concat(chunks);
          next();
        });
      })
      .forRoutes({ path: 'api/stripe/webhook', method: RequestMethod.POST });
  }
}
