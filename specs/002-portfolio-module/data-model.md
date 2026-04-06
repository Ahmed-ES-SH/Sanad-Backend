# Data Model: Portfolio Module

**Feature**: 002-portfolio-module
**Date**: 2026-04-06
**PRD Reference**: §4 Database Schema (`projects`)

## Entity: Project

**Table name**: `projects`
**Schema file**: `src/portfolio/schema/project.schema.ts`

### Columns

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `id` | `uuid` | PK, auto-generated | `uuid_generate_v4()` | TypeORM `@PrimaryGeneratedColumn('uuid')` |
| `title` | `varchar(200)` | NOT NULL | — | Required |
| `slug` | `varchar(220)` | NOT NULL, UNIQUE | — | Auto-generated from title |
| `shortDescription` | `text` | NOT NULL | — | Maps to DB column `short_description` |
| `longDescription` | `text` | NULLABLE | `null` | Maps to DB column `long_description` |
| `coverImageUrl` | `varchar(500)` | NULLABLE | `null` | Cloud storage URL. Maps to `cover_image_url` |
| `images` | `text[]` | NOT NULL | `'{}'` | Gallery image URLs array |
| `techStack` | `text[]` | NOT NULL | `'{}'` | Technologies used. Maps to `tech_stack` |
| `category` | `varchar(100)` | NULLABLE | `null` | e.g. "Web App", "Mobile" |
| `liveUrl` | `varchar(500)` | NULLABLE | `null` | Live project URL. Maps to `live_url` |
| `repoUrl` | `varchar(500)` | NULLABLE | `null` | Repository URL. Maps to `repo_url` |
| `isPublished` | `boolean` | NOT NULL | `false` | Maps to `is_published` |
| `isFeatured` | `boolean` | NOT NULL | `false` | Maps to `is_featured` |
| `order` | `integer` | NOT NULL | `0` | Display order for sorting |
| `createdAt` | `timestamp` | NOT NULL | `now()` | TypeORM `@CreateDateColumn()` |
| `updatedAt` | `timestamp` | NOT NULL | `now()` | TypeORM `@UpdateDateColumn()` |

### Indexes

| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| `PK_projects` | `id` | PRIMARY | Primary key |
| `UQ_projects_slug` | `slug` | UNIQUE | Slug lookups, uniqueness constraint |
| `IX_projects_published_order` | `is_published`, `order` | COMPOSITE | Public listing query optimization |
| `IX_projects_category` | `category` | BTREE | Category filtering |

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

@Entity('projects')
@Index(['isPublished', 'order'])
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'varchar', length: 220, unique: true })
  slug: string;

  @Column({ type: 'text', name: 'short_description' })
  shortDescription: string;

  @Column({ type: 'text', name: 'long_description', nullable: true })
  longDescription: string | null;

  @Column({
    type: 'varchar',
    length: 500,
    name: 'cover_image_url',
    nullable: true,
  })
  coverImageUrl: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  images: string[];

  @Column({ type: 'text', array: true, name: 'tech_stack', default: '{}' })
  techStack: string[];

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @Column({ type: 'varchar', length: 500, name: 'live_url', nullable: true })
  liveUrl: string | null;

  @Column({ type: 'varchar', length: 500, name: 'repo_url', nullable: true })
  repoUrl: string | null;

  @Column({ type: 'boolean', name: 'is_published', default: false })
  isPublished: boolean;

  @Column({ type: 'boolean', name: 'is_featured', default: false })
  isFeatured: boolean;

  @Column({ type: 'int', default: 0 })
  order: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### Relationships

None. The `projects` entity is independent with no foreign keys.

### Validation Rules

| Field | Rule | Source |
|-------|------|--------|
| `title` | NOT NULL, max 200 chars | PRD §4, FR-001 |
| `slug` | UNIQUE, auto-generated | PRD §4, FR-002 |
| `shortDescription` | NOT NULL for creation | PRD §4, FR-001 |
| `coverImageUrl` | Required for publishing | FR-007 |
| `isFeatured` | Max 6 featured projects (configurable) | FR-008 |

### State Transitions

```
Created (isPublished=false, isFeatured=false)
    │
    ├── publish (requires coverImageUrl) ──► Published (isPublished=true)
    │                                            │
    │                                            ├── feature ──► Published + Featured
    │                                            │
    │                                            └── unpublish ──► Unpublished (isFeatured preserved)
    │                                                                  │
    │                                                                  └── publish ──► Published
    │
    └── delete ──► Removed (record + cover + gallery images purged)
```

## DTO Definitions

### CreateProjectDto

```typescript
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
```

### UpdateProjectDto

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}
```

### ReorderProjectsDto

```typescript
import { IsArray, ValidateNested, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ReorderItem {
  @IsUUID()
  @ApiProperty({ description: 'Project ID' })
  id: string;

  @IsInt()
  @Min(0)
  @ApiProperty({ description: 'New display order position' })
  order: number;
}

export class ReorderProjectsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItem)
  @ApiProperty({ type: [ReorderItem], description: 'Array of project IDs with new order positions' })
  items: ReorderItem[];
}
```

### FilterProjectsQueryDto

```typescript
import { IsOptional, IsString, IsBoolean, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterProjectsQueryDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Filter by category (case-insensitive)' })
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  @ApiPropertyOptional({ description: 'Filter by tech stack (comma-separated)', type: [String] })
  techStack?: string[];

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  @ApiPropertyOptional({ description: 'Filter featured projects only' })
  featured?: boolean;
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

A TypeORM migration will be generated to create the `projects` table with all columns and indexes defined above.

```bash
npm run migration:generate --name=CreateProjectsTable
```
