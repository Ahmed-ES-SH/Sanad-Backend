# Data Model: Contact Module

**Feature**: 006-contact-module
**Date**: 2026-04-06
**PRD Reference**: §4 Database Schema (`contact_messages`)

## Entity: ContactMessage

**Table name**: `contact_messages`
**Schema file**: `src/contact/schema/contact-message.schema.ts`

### Columns

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `id` | `uuid` | PK, auto-generated | `uuid_generate_v4()` | TypeORM `@PrimaryGeneratedColumn('uuid')` |
| `fullName` | `varchar(100)` | NOT NULL | — | Visitor's full name. Maps to DB column `full_name` |
| `email` | `varchar(255)` | NOT NULL | — | Visitor's email address |
| `subject` | `varchar(200)` | NOT NULL | — | Message subject line |
| `message` | `text` | NOT NULL | — | Message body content |
| `isRead` | `boolean` | NOT NULL | `false` | Read status. Maps to `is_read` |
| `repliedAt` | `timestamp` | NULLABLE | `null` | When admin marked as replied. Maps to `replied_at` |
| `ipAddress` | `varchar(45)` | NULLABLE | `null` | Submitter's IP for rate limiting audit. Maps to `ip_address` |
| `createdAt` | `timestamp` | NOT NULL | `now()` | TypeORM `@CreateDateColumn()` |
| `updatedAt` | `timestamp` | NOT NULL | `now()` | TypeORM `@UpdateDateColumn()` |

### Indexes

| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| `PK_contact_messages` | `id` | PRIMARY | Primary key |
| `IX_contact_messages_is_read` | `is_read` | BTREE | Read/unread filter optimization |
| `IX_contact_messages_created_at` | `created_at` | BTREE | Default sort (newest first) optimization |

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

@Entity('contact_messages')
export class ContactMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, name: 'full_name' })
  fullName: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 200 })
  subject: string;

  @Column({ type: 'text' })
  message: string;

  @Index()
  @Column({ type: 'boolean', name: 'is_read', default: false })
  isRead: boolean;

  @Column({ type: 'timestamp', name: 'replied_at', nullable: true })
  repliedAt: Date | null;

  @Column({ type: 'varchar', length: 45, name: 'ip_address', nullable: true })
  ipAddress: string | null;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### Relationships

None. The `contact_messages` entity is independent with no foreign keys.

### Validation Rules

| Field | Rule | Source |
|-------|------|--------|
| `fullName` | NOT NULL, max 100 chars | FR-001, FR-002 |
| `email` | NOT NULL, valid email format, max 255 chars | FR-001, FR-002 |
| `subject` | NOT NULL, max 200 chars | FR-001, FR-002 |
| `message` | NOT NULL | FR-001, FR-002 |
| `isRead` | Default `false` on creation | FR-005 |
| `repliedAt` | Default `null` on creation | FR-005 |

### State Transitions

```
Created (isRead=false, repliedAt=null)
    │
    ├── markAsRead ──► Read (isRead=true)
    │
    ├── markAsReplied ──► Replied (repliedAt=timestamp, isRead=true)
    │
    └── delete ──► Removed (record permanently deleted)
```

## DTO Definitions

### CreateContactMessageDto

```typescript
import { IsNotEmpty, IsString, IsEmail, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateContactMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @ApiProperty({ description: 'Full name of the visitor', maxLength: 100 })
  fullName: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  @ApiProperty({ description: 'Email address of the visitor', maxLength: 255 })
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @ApiProperty({ description: 'Subject of the message', maxLength: 200 })
  subject: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Message body content' })
  message: string;
}
```

### ContactQueryDto

```typescript
import { IsOptional, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ContactQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @ApiPropertyOptional({
    description: 'Filter by read status',
    enum: ['true', 'false'],
  })
  isRead?: boolean;
}
```

### Notes on DTOs

- **No UpdateContactMessageDto**: Contact messages are not editable by admins. The spec only allows marking as read, marking as replied, and deleting.
- **No MarkRepliedDto**: The mark-as-replied endpoint requires no request body — the server sets `replied_at` to the current timestamp automatically.
- **The `CreateContactMessageDto` does NOT accept file uploads**: FR-004 explicitly prohibits multipart uploads on the submission endpoint.

## Migration

A TypeORM migration will be generated to create the `contact_messages` table with all columns and indexes defined above.

```bash
npm run migration:generate --name=CreateContactMessagesTable
```
