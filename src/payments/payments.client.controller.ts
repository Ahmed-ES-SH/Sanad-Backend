import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('payments')
export class PaymentsClientController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-intent')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a payment intent' })
  @ApiResponse({
    status: 201,
    description: 'Payment intent created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body',
  })
  @ApiResponse({
    status: 502,
    description: 'Stripe API error',
  })
  async createPaymentIntent(
    @Body() dto: CreatePaymentIntentDto,
  ): Promise<{
    clientSecret: string;
    paymentId: string;
    stripePaymentIntentId: string;
  }> {
    return this.paymentsService.createPaymentIntent(dto);
  }
}
