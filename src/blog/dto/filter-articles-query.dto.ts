import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FilterArticlesQueryDto {
  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  tag?: string;
}
