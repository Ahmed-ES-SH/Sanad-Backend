import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Module({
  providers: [
    {
      provide: Stripe,
      useFactory: (configService: ConfigService) => {
        return new Stripe(
          configService.getOrThrow<string>('STRIPE_SECRET_KEY'),
          {
            apiVersion: '2025-02-24.acacia',
          },
        );
      },
      inject: [ConfigService],
    },
  ],
  exports: [Stripe],
})
export class StripeModule {}
