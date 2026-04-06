import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { PaymentFilterDto } from './dto/payment-filter.dto';
import { Payment } from './schema/payment.schema';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/Roles.decorator';
import { UserRoleEnum } from '../auth/types/UserRoleEnum';

@ApiTags('Payments (Admin)')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
@Controller('admin/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all payments with filters and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of payments',
  })
  async findAll(@Query() query: PaymentFilterDto): Promise<{
    data: Payment[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    return this.paymentsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single payment by ID' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @ApiResponse({
    status: 200,
    description: 'Payment details',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Payment> {
    return this.paymentsService.findOne(id);
  }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Refund a succeeded payment' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @ApiResponse({
    status: 200,
    description: 'Payment refunded successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Payment cannot be refunded',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  async refund(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ id: string; status: string; message: string }> {
    return this.paymentsService.refund(id);
  }
}
