import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export const createStripeClient = (configService: ConfigService): Stripe => {
  const secretKey = configService.getOrThrow<string>('STRIPE_SECRET_KEY');

  return new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
  });
};
