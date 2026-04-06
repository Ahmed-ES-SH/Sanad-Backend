import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export const createStripeClient = (configService: ConfigService): Stripe => {
  return new Stripe(configService.getOrThrow<string>('STRIPE_SECRET_KEY'), {
    apiVersion: '2025-02-24.acacia',
  });
};
