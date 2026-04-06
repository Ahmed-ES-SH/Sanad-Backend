import {
  IsNotEmpty, IsOptional, IsString, IsArray, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @ApiProperty({ description: 'Project title', maxLength: 200 })
  title: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Short description of the project' })
  shortDescription: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Detailed project description' })
  longDescription?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Cover image URL from cloud storage' })
  coverImageUrl?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ApiPropertyOptional({ description: 'Gallery image URLs', type: [String] })
  images?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ApiPropertyOptional({ description: 'Technologies used in the project', type: [String] })
  techStack?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(100)
  @ApiPropertyOptional({ description: 'Project category (e.g., "Web App", "Mobile")' })
  category?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Live project URL' })
  liveUrl?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Source code repository URL' })
  repoUrl?: string;
}
