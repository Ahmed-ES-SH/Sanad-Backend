import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus } from '../enums/payment-status.enum';

export class PaymentResponseDto {
  @ApiProperty({ description: 'Payment UUID' })
  id: string;

  @ApiProperty({ description: 'User ID', nullable: true })
  userId: string | null;

  @ApiProperty({ description: 'Stripe PaymentIntent ID' })
  stripePaymentIntentId: string;

  @ApiProperty({ description: 'Stripe Customer ID', nullable: true })
  stripeCustomerId: string | null;

  @ApiProperty({ description: 'Payment amount in dollars' })
  amount: number;

  @ApiProperty({ description: 'ISO 4217 currency code' })
  currency: string;

  @ApiProperty({ enum: PaymentStatus, description: 'Payment status' })
  status: PaymentStatus;

  @ApiProperty({ description: 'Payment description', nullable: true })
  description: string | null;

  @ApiProperty({ description: 'Metadata', nullable: true })
  metadata: Record<string, unknown> | null;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: Date;
}
