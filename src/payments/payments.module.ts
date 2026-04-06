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
import { createStripeClient } from '../config/stripe.config';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), ConfigModule],
  controllers: [
    PaymentsController,
    PaymentsClientController,
    PaymentsWebhookController,
  ],
  providers: [
    PaymentsService,
    {
      provide: Stripe,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        createStripeClient(configService),
    },
  ],
})
export class PaymentsModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply((req: any, res: any, next: any) => {
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
