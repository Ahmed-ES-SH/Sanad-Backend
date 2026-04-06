import { IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class PaymentFilterDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  @ApiPropertyOptional({
    enum: PaymentStatus,
    description: 'Filter by payment status',
  })
  status?: PaymentStatus;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    description: 'Filter payments from this date (ISO 8601)',
    example: '2026-01-01',
  })
  startDate?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    description: 'Filter payments until this date (ISO 8601)',
    example: '2026-12-31',
  })
  endDate?: string;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ description: 'Filter by user ID' })
  userId?: string;
}
