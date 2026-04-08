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
  ApiBody,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { CreatePaymentIntentResponseDto } from './dto/create-payment-intent-response.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('payments')
export class PaymentsClientController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * POST /payments/create-intent
   * 
   * Create a Stripe PaymentIntent for collecting payment from the user.
   * This endpoint returns a `clientSecret` that must be used with Stripe.js
   * on the frontend to securely collect and process payment details.
   * 
   * Authentication: Any authenticated user (any role)
   * 
   * Request Body (CreatePaymentIntentDto):
   * - amount (number, required): Amount in dollars (NOT cents), min 0.50, max 2 decimal places
   *   Example: 50.00 for fifty dollars
   * - currency (string, optional): ISO 4217 currency code, default 'usd', max 10 chars
   *   Example: 'usd', 'eur', 'gbp'
   * - description (string, required): Description of the payment
   *   Example: 'Web Development Consultation'
   * - userId (string, optional): User UUID to associate with the payment
   *   Example: '123e4567-e89b-12d3-a456-426614174000'
   * 
   * Example Request:
   * POST /payments/create-intent
   * Headers: { 
   *   Authorization: 'Bearer <user_token>',
   *   Content-Type: 'application/json'
   * }
   * Body: {
   *   "amount": 50.00,
   *   "currency": "usd",
   *   "description": "Web Development Consultation"
   * }
   * 
   * Example Success Response (201 Created):
   * {
   *   "clientSecret": "pi_3N5xYz2eZvKYlo2C0bXcQpRt_secret_xxxxxxxxxxxxxxxxxxxxxxxx",
   *   "paymentId": "550e8400-e29b-41d4-a716-446655440000",
   *   "stripePaymentIntentId": "pi_3N5xYz2eZvKYlo2C0bXcQpRt"
   * }
   * 
   * Frontend Integration Flow:
   * 1. Call this endpoint with payment details to get `clientSecret`
   * 2. Use Stripe.js `stripe.confirmCardPayment(clientSecret, { payment_method: { ... } })`
   *    to securely collect payment details from the user
   * 3. Stripe processes the payment and sends the result to the backend webhook
   * 4. The webhook updates the payment status automatically (no frontend action needed)
   * 5. Optionally poll or listen for payment status updates on the frontend
   * 
   * Error Responses:
   * - 400 Bad Request: Invalid input (e.g., amount < 0.50, invalid currency, missing description)
   * - 401 Unauthorized: Missing or invalid authentication token
   * - 502 Bad Gateway: Stripe API error (e.g., invalid API key, network issue)
   */
  @Post('create-intent')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a payment intent' })
  @ApiBody({
    type: CreatePaymentIntentDto,
    examples: {
      standard: {
        summary: 'Standard payment',
        value: {
          amount: 50.00,
          currency: 'usd',
          description: 'Web Development Consultation'
        }
      },
      withUserId: {
        summary: 'Payment with user association',
        value: {
          amount: 100.00,
          currency: 'eur',
          description: 'Premium Package Upgrade',
          userId: '123e4567-e89b-12d3-a456-426614174000'
        }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Payment intent created successfully',
    type: CreatePaymentIntentResponseDto,
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
  ): Promise<CreatePaymentIntentResponseDto> {
    return this.paymentsService.createPaymentIntent(dto);
  }
}
