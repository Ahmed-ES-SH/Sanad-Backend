import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  BadGatewayException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { Payment } from './schema/payment.schema';
import { PaymentStatus } from './enums/payment-status.enum';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PaymentFilterDto } from './dto/payment-filter.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { RefundResponseDto } from './dto/refund-response.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly webhookSecret: string;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly stripe: Stripe,
    private readonly configService: ConfigService,
  ) {
    this.webhookSecret = this.configService.getOrThrow<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
  }

  private toCents(dollars: number): number {
    return Math.round(dollars * 100);
  }

  private toDollars(cents: number): number {
    return cents / 100;
  }

  async createPaymentIntent(dto: CreatePaymentIntentDto): Promise<{
    clientSecret: string;
    paymentId: string;
    stripePaymentIntentId: string;
  }> {
    let paymentIntent: Stripe.PaymentIntent;
    try {
      paymentIntent = await this.stripe.paymentIntents.create(
        {
          amount: this.toCents(dto.amount),
          currency: dto.currency ?? 'usd',
          description: dto.description,
        },
        {
          idempotencyKey: `create_intent:${Date.now()}:${Math.random().toString(36).substring(7)}`,
        },
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Stripe PaymentIntent creation failed: ${message}`);
      throw new BadGatewayException(
        'Payment gateway temporarily unavailable. Please try again.',
      );
    }

    const payment = this.paymentRepository.create({
      userId: dto.userId ?? null,
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId: paymentIntent.customer as string | null,
      amount: dto.amount,
      currency: dto.currency ?? 'usd',
      description: dto.description,
      status: PaymentStatus.PENDING,
    });

    const savedPayment = await this.paymentRepository.save(payment);

    return {
      clientSecret: paymentIntent.client_secret as string,
      paymentId: savedPayment.id,
      stripePaymentIntentId: paymentIntent.id,
    };
  }

  verifyWebhookSignature(payload: Buffer, signature: string): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.warn(`Stripe webhook verification failed: ${message}`);
      throw new BadRequestException('Invalid Stripe webhook signature');
    }
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    const stripeEvent = event.data.object as
      | Stripe.PaymentIntent
      | Stripe.Charge;

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(
          stripeEvent as Stripe.PaymentIntent,
        );
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(
          stripeEvent as Stripe.PaymentIntent,
        );
        break;

      case 'charge.refunded':
        await this.handleChargeRefunded(stripeEvent as Stripe.Charge);
        break;

      default:
        this.logger.debug(
          `Ignored unsupported Stripe event type: ${event.type}`,
        );
        break;
    }
  }

  private async handlePaymentIntentSucceeded(
    intent: Stripe.PaymentIntent,
  ): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { stripePaymentIntentId: intent.id },
    });

    if (!payment) {
      this.logger.warn(
        `Payment not found for Stripe intent: ${intent.id}. Skipping.`,
      );
      return;
    }

    if (payment.status === PaymentStatus.SUCCEEDED) {
      this.logger.debug(
        `Payment ${payment.id} already succeeded. Idempotent skip.`,
      );
      return;
    }

    payment.status = PaymentStatus.SUCCEEDED;
    payment.metadata = intent.metadata as Record<string, unknown> | null;
    await this.paymentRepository.save(payment);

    this.logger.log(`Payment ${payment.id} updated to SUCCEEDED via webhook`);
  }

  private async handlePaymentIntentFailed(
    intent: Stripe.PaymentIntent,
  ): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { stripePaymentIntentId: intent.id },
    });

    if (!payment) {
      this.logger.warn(
        `Payment not found for Stripe intent: ${intent.id}. Skipping.`,
      );
      return;
    }

    if (payment.status === PaymentStatus.FAILED) {
      this.logger.debug(
        `Payment ${payment.id} already failed. Idempotent skip.`,
      );
      return;
    }

    payment.status = PaymentStatus.FAILED;
    await this.paymentRepository.save(payment);

    this.logger.log(`Payment ${payment.id} updated to FAILED via webhook`);
  }

  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    const paymentIntentId =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id;

    if (!paymentIntentId) {
      this.logger.warn(
        `Charge ${charge.id} has no payment_intent ID. Skipping.`,
      );
      return;
    }

    const payment = await this.paymentRepository.findOne({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (!payment) {
      this.logger.warn(
        `Payment not found for Stripe intent: ${paymentIntentId}. Skipping.`,
      );
      return;
    }

    if (payment.status === PaymentStatus.REFUNDED) {
      this.logger.debug(
        `Payment ${payment.id} already refunded. Idempotent skip.`,
      );
      return;
    }

    payment.status = PaymentStatus.REFUNDED;
    payment.metadata = {
      ...(payment.metadata ?? {}),
      refundId: charge.id,
      refundedAt: new Date().toISOString(),
    };
    await this.paymentRepository.save(payment);

    this.logger.log(`Payment ${payment.id} updated to REFUNDED via webhook`);
  }

  private toResponseDto(payment: Payment): PaymentResponseDto {
    return {
      id: payment.id,
      userId: payment.userId,
      stripePaymentIntentId: payment.stripePaymentIntentId,
      stripeCustomerId: payment.stripeCustomerId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      description: payment.description,
      metadata: payment.metadata,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  private async findOneOrFail(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException(`Payment with ID "${id}" not found`);
    }
    return payment;
  }

  async findAll(query: PaymentFilterDto): Promise<{
    data: PaymentResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const {
      page = 1,
      limit = 10,
      order = 'DESC',
      sortBy = 'createdAt',
    } = query;
    const where: Record<string, unknown> = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.startDate || query.endDate) {
      const start = query.startDate
        ? new Date(query.startDate)
        : new Date('1970-01-01');
      const end = query.endDate ? new Date(query.endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      where.createdAt = Between(start, end);
    }

    const [data, total] = await this.paymentRepository.findAndCount({
      where,
      order: { [sortBy]: order } as Record<string, 'ASC' | 'DESC'>,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: data.map((p) => this.toResponseDto(p)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<PaymentResponseDto> {
    const payment = await this.findOneOrFail(id);
    return this.toResponseDto(payment);
  }

  async refund(id: string): Promise<RefundResponseDto> {
    const payment = await this.findOneOrFail(id);

    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new BadRequestException(
        `Cannot refund: payment status is '${payment.status}'. Only succeeded payments can be refunded.`,
      );
    }

    try {
      await this.stripe.refunds.create(
        { payment_intent: payment.stripePaymentIntentId },
        {
          idempotencyKey: `refund:${payment.id}:${Date.now()}`,
        },
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(
        `Stripe refund failed for payment ${payment.id}: ${message}`,
      );
      throw new BadGatewayException(
        'Refund failed at payment gateway. Payment status unchanged.',
      );
    }

    payment.status = PaymentStatus.REFUNDED;
    payment.metadata = {
      ...(payment.metadata ?? {}),
      adminRefundedAt: new Date().toISOString(),
    };
    await this.paymentRepository.save(payment);

    return {
      id: payment.id,
      status: payment.status,
      message: 'Payment refunded successfully',
    };
  }
}
