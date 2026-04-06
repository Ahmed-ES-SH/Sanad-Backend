# Data Model: Services Module

**Feature**: 001-services-module
**Date**: 2026-04-06
**PRD Reference**: §4 Database Schema (`services`)

## Entity: Service

**Table name**: `services`
**Schema file**: `src/services/schema/service.schema.ts`

### Columns

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `id` | `uuid` | PK, auto-generated | `uuid_generate_v4()` | TypeORM `@PrimaryGeneratedColumn('uuid')` |
| `title` | `varchar(150)` | NOT NULL | — | Required |
| `slug` | `varchar(160)` | NOT NULL, UNIQUE | — | Auto-generated from title |
| `shortDescription` | `text` | NOT NULL | — | Maps to DB column `short_description` |
| `longDescription` | `text` | NULLABLE | `null` | Maps to DB column `long_description` |
| `iconUrl` | `varchar(255)` | NULLABLE | `null` | Backblaze B2 URL. Maps to `icon_url` |
| `coverImageUrl` | `varchar(255)` | NULLABLE | `null` | Backblaze B2 URL. Maps to `cover_image_url` |
| `isPublished` | `boolean` | NOT NULL | `false` | Maps to `is_published` |
| `order` | `integer` | NOT NULL | `0` | Display order for sorting |
| `createdAt` | `timestamp` | NOT NULL | `now()` | TypeORM `@CreateDateColumn()` |
| `updatedAt` | `timestamp` | NOT NULL | `now()` | TypeORM `@UpdateDateColumn()` |

### Indexes

| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| `PK_services` | `id` | PRIMARY | Primary key |
| `UQ_services_slug` | `slug` | UNIQUE | Slug lookups, uniqueness constraint |
| `IX_services_is_published_order` | `is_published`, `order` | COMPOSITE | Public listing query optimization |

### TypeORM Entity Definition

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('services')
@Index(['isPublished', 'order'])
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'varchar', length: 160, unique: true })
  slug: string;

  @Column({ type: 'text', name: 'short_description' })
  shortDescription: string;

  @Column({ type: 'text', name: 'long_description', nullable: true })
  longDescription: string | null;

  @Column({ type: 'varchar', length: 255, name: 'icon_url', nullable: true })
  iconUrl: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'cover_image_url',
    nullable: true,
  })
  coverImageUrl: string | null;

  @Column({ type: 'boolean', name: 'is_published', default: false })
  isPublished: boolean;

  @Column({ type: 'int', default: 0 })
  order: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### Relationships

None. The `services` entity is independent with no foreign keys.

### Validation Rules

| Field | Rule | Source |
|-------|------|--------|
| `title` | NOT NULL, max 150 chars | PRD §4, FR-001 |
| `slug` | UNIQUE, auto-generated | PRD §4, FR-002, FR-003 |
| `shortDescription` | NOT NULL for creation | PRD §4, FR-001 |
| `isPublished` | Requires `title` + `shortDescription` to be true | PRD §5.1 Business Rules, FR-007 |

### State Transitions

```
Created (isPublished=false)
    │
    ├── publish ──► Published (isPublished=true)
    │                   │
    │                   └── unpublish ──► Unpublished (isPublished=false)
    │                                        │
    │                                        └── publish ──► Published
    │
    └── delete ──► Removed (record + images purged)
```

## DTO Definitions

### CreateServiceDto

```typescript
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @ApiProperty({ description: 'Service title', maxLength: 150 })
  title: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Short description of the service' })
  shortDescription: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Detailed description of the service' })
  longDescription?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Icon image URL from cloud storage' })
  iconUrl?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Cover image URL from cloud storage' })
  coverImageUrl?: string;
}
```

### UpdateServiceDto

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateServiceDto } from './create-service.dto';

export class UpdateServiceDto extends PartialType(CreateServiceDto) {}
```

### ReorderServicesDto

```typescript
import { IsArray, ValidateNested, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ReorderItem {
  @IsUUID()
  @ApiProperty({ description: 'Service ID' })
  id: string;

  @IsInt()
  @Min(0)
  @ApiProperty({ description: 'New display order position' })
  order: number;
}

export class ReorderServicesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItem)
  @ApiProperty({ type: [ReorderItem], description: 'Array of service IDs with new order positions' })
  items: ReorderItem[];
}
```

### PaginationQueryDto (shared — `src/common/dto/`)

```typescript
import { IsOptional, IsInt, Min, Max, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({ default: 1 })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @ApiPropertyOptional({ default: 10 })
  limit?: number = 10;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ default: 'createdAt' })
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  order?: 'ASC' | 'DESC' = 'DESC';
}
```

## Migration

A TypeORM migration will be generated to create the `services` table with all columns and indexes defined above.

```bash
npm run migration:generate --name=CreateServicesTable
```
