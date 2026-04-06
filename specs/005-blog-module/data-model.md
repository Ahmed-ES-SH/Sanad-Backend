# Data Model: Blog Module

**Feature**: 005-blog-module
**Date**: 2026-04-06
**PRD Reference**: §4 Database Schema (`articles`)

## Entity: Article

**Table name**: `articles`
**Schema file**: `src/blog/schema/article.schema.ts`

### Columns

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `id` | `uuid` | PK, auto-generated | `uuid_generate_v4()` | TypeORM `@PrimaryGeneratedColumn('uuid')` |
| `title` | `varchar(300)` | NOT NULL | — | Required |
| `slug` | `varchar(320)` | NOT NULL, UNIQUE | — | Auto-generated from title |
| `excerpt` | `text` | NULLABLE | `null` | Required for publishing |
| `content` | `text` | NOT NULL | — | HTML or Markdown body |
| `coverImageUrl` | `varchar(500)` | NULLABLE | `null` | Cloud storage URL. Maps to `cover_image_url` |
| `tags` | `text[]` | NOT NULL | `'{}'` | Tag strings array |
| `isPublished` | `boolean` | NOT NULL | `false` | Maps to `is_published` |
| `publishedAt` | `timestamp` | NULLABLE | `null` | Maps to `published_at`. Set on first publish, never reset |
| `readTimeMinutes` | `integer` | NOT NULL | `1` | Maps to `read_time_minutes`. Auto-calculated from content word count |
| `viewsCount` | `integer` | NOT NULL | `0` | Maps to `views_count`. Atomically incremented |
| `createdAt` | `timestamp` | NOT NULL | `now()` | TypeORM `@CreateDateColumn()` |
| `updatedAt` | `timestamp` | NOT NULL | `now()` | TypeORM `@UpdateDateColumn()` |

### Indexes

| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| `PK_articles` | `id` | PRIMARY | Primary key |
| `UQ_articles_slug` | `slug` | UNIQUE | Slug lookups, uniqueness constraint |
| `IX_articles_published_date` | `is_published`, `published_at` | COMPOSITE | Public listing query optimization |
| `IX_articles_tags` | `tags` | GIN | Tag array filtering |

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

@Entity('articles')
@Index(['isPublished', 'publishedAt'])
export class Article {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'varchar', length: 320, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  excerpt: string | null;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'varchar',
    length: 500,
    name: 'cover_image_url',
    nullable: true,
  })
  coverImageUrl: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'boolean', name: 'is_published', default: false })
  isPublished: boolean;

  @Column({ type: 'timestamp', name: 'published_at', nullable: true })
  publishedAt: Date | null;

  @Column({ type: 'int', name: 'read_time_minutes', default: 1 })
  readTimeMinutes: number;

  @Column({ type: 'int', name: 'views_count', default: 0 })
  viewsCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### Relationships

None. The `articles` entity is independent with no foreign keys.

### Validation Rules

| Field | Rule | Source |
|-------|------|--------|
| `title` | NOT NULL, max 300 chars | PRD §4, FR-001 |
| `slug` | UNIQUE, auto-generated | PRD §4, FR-002 |
| `content` | NOT NULL for creation | PRD §4, FR-001 |
| `excerpt` | Required for publishing | FR-006 |
| `readTimeMinutes` | Auto-calculated, minimum 1 | FR-003 |
| `publishedAt` | Set on first publish, never reset | FR-007 |
| `viewsCount` | Atomically incremented, never manually set | FR-009 |

### State Transitions

```
Created (isPublished=false, publishedAt=null, viewsCount=0)
    │
    ├── publish (requires excerpt) ──► Published (isPublished=true, publishedAt=NOW)
    │                                      │
    │                                      ├── view ──► viewsCount++ (atomic)
    │                                      │
    │                                      └── unpublish ──► Unpublished (isPublished=false, publishedAt PRESERVED)
    │                                                             │
    │                                                             └── republish ──► Published (publishedAt PRESERVED)
    │
    └── delete ──► Removed (record + cover image purged)
```

## DTO Definitions

### CreateArticleDto

```typescript
import {
  IsNotEmpty, IsOptional, IsString, IsArray, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateArticleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  @ApiProperty({ description: 'Article title', maxLength: 300 })
  title: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Article content body (HTML or Markdown)' })
  content: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Article excerpt/summary' })
  excerpt?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Cover image URL from cloud storage' })
  coverImageUrl?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ApiPropertyOptional({ description: 'Article tags', type: [String] })
  tags?: string[];
}
```

### UpdateArticleDto

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateArticleDto } from './create-article.dto';

export class UpdateArticleDto extends PartialType(CreateArticleDto) {}
```

### FilterArticlesQueryDto

```typescript
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterArticlesQueryDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Filter by tag (case-insensitive exact match)' })
  tag?: string;
}
```

### PaginationQueryDto (shared — `src/common/dto/`)

Already created by 001-services-module. See `src/common/dto/pagination-query.dto.ts`.

## Utility: Read Time Calculator

```typescript
// In src/blog/blog.service.ts (private method)

private calculateReadTime(content: string): number {
  // Strip HTML tags for accurate word count
  const text = content.replace(/<[^>]*>/g, '');
  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}
```

## Migration

A TypeORM migration will be generated to create the `articles` table with all columns and indexes defined above.

```bash
npm run migration:generate --name=CreateArticlesTable
```
