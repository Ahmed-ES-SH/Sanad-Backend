import { IsOptional, IsInt, Min, Max, IsEnum, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Service } from '../../services/schema/service.schema';

/**
 * Sort Order Enum
 */
export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

/**
 * Allowed Sort Fields for Services entity
 */
export const SERVICE_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'title',
  'order',
] as const;

export type ServiceSortField = (typeof SERVICE_SORT_FIELDS)[number];

/**
 * Pagination Query DTO for Services
 */
export class ServicesPaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: SERVICE_SORT_FIELDS,
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(SERVICE_SORT_FIELDS)
  sortBy?: ServiceSortField = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.DESC;
}
