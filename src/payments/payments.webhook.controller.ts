import {
  BadRequestException,
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { Public } from '../auth/decorators/public.decorator';

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

@ApiTags('Stripe Webhooks')
@Public()
@Controller('api/stripe')
export class PaymentsWebhookController {
  private readonly logger = new Logger(PaymentsWebhookController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('webhook')
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  @ApiResponse({
    status: 200,
    description: 'Webhook received successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook signature',
  })
  async handleWebhook(
    @Req() req: RawBodyRequest,
    @Headers('stripe-signature') signature?: string,
  ): Promise<{ received: boolean }> {
    if (!signature) {
      this.logger.warn('Webhook rejected: missing stripe-signature header');
      throw new BadRequestException('Invalid webhook signature');
    }

    if (!req.rawBody) {
      this.logger.warn('Webhook rejected: missing raw body');
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = this.paymentsService.verifyWebhookSignature(
      req.rawBody,
      signature,
    );

    await this.paymentsService.handleWebhookEvent(event);

    return { received: true };
  }
}
