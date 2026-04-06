import { IsEnum, IsInt, IsOptional, IsPositive, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @ApiProperty({ required: false, default: 1 })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(100)
  @ApiProperty({ required: false, default: 10 })
  limit?: number = 10;

  @IsOptional()
  @IsEnum(SortOrder)
  @ApiProperty({ required: false, enum: SortOrder, default: SortOrder.DESC })
  order?: SortOrder = SortOrder.DESC;

  @IsOptional()
  @IsEnum(['createdAt', 'updatedAt', 'viewsCount', 'publishedAt', 'title'])
  @ApiProperty({
    required: false,
    default: 'createdAt',
    enum: ['createdAt', 'updatedAt', 'viewsCount', 'publishedAt', 'title'],
  })
  sortBy?: string = 'createdAt';
}
