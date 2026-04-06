import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentIntentDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  @ApiProperty({ description: 'Payment amount in dollars', example: 50.0 })
  amount: number;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  @ApiPropertyOptional({
    description: 'ISO 4217 currency code',
    default: 'usd',
    example: 'usd',
  })
  currency?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Payment description',
    example: 'Web Development Consultation',
  })
  description: string;

  @IsUUID()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'User ID to associate with the payment',
  })
  userId?: string;
}
