# Data Model: Payments Module

**Feature**: 007-payments-module
**Date**: 2026-04-06
**PRD Reference**: §4 Database Schema (`payments`), §5.5 Payments Module

## Enum: PaymentStatus

**File**: `src/payments/enums/payment-status.enum.ts`

```typescript
export enum PaymentStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}
```

## Entity: Payment

**Table name**: `payments`
**Schema file**: `src/payments/schema/payment.schema.ts`

### Columns

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `id` | `uuid` | PK, auto-generated | `uuid_generate_v4()` | TypeORM `@PrimaryGeneratedColumn('uuid')` |
| `userId` | `uuid` | NULLABLE, INDEX | `null` | Reference to User (stored as UUID, no FK constraint to keep module decoupled). Maps to `user_id` |
| `stripePaymentIntentId` | `varchar(255)` | NOT NULL, UNIQUE | — | Stripe PaymentIntent ID (e.g., `pi_xxx`). Maps to `stripe_payment_intent_id` |
| `stripeCustomerId` | `varchar(255)` | NULLABLE | `null` | Stripe Customer ID (e.g., `cus_xxx`). Maps to `stripe_customer_id` |
| `amount` | `decimal(10,2)` | NOT NULL | — | Amount in dollars (converted to cents for Stripe API) |
| `currency` | `varchar(10)` | NOT NULL | `'usd'` | ISO 4217 currency code |
| `status` | `enum` | NOT NULL | `'pending'` | Payment status: pending, succeeded, failed, refunded |
| `description` | `text` | NULLABLE | `null` | Payment description |
| `metadata` | `jsonb` | NULLABLE | `null` | Flexible metadata from Stripe events |
| `createdAt` | `timestamp` | NOT NULL | `now()` | TypeORM `@CreateDateColumn()` |
| `updatedAt` | `timestamp` | NOT NULL | `now()` | TypeORM `@UpdateDateColumn()` |

### Indexes

| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| `PK_payments` | `id` | PRIMARY | Primary key |
| `UQ_payments_stripe_intent` | `stripe_payment_intent_id` | UNIQUE | Stripe intent lookups, idempotency |
| `IX_payments_status` | `status` | BTREE | Filter by status queries |
| `IX_payments_user_id` | `user_id` | BTREE | Filter by user queries |
| `IX_payments_created_at` | `created_at` | BTREE | Date range filter queries |

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
import { PaymentStatus } from '../enums/payment-status.enum';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  @Index()
  userId: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'stripe_payment_intent_id',
    unique: true,
  })
  stripePaymentIntentId: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'stripe_customer_id',
    nullable: true,
  })
  stripeCustomerId: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'usd' })
  currency: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  @Index()
  status: PaymentStatus;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### Relationships

The `userId` column references the `users` table but is stored as a bare UUID without a TypeORM `@ManyToOne` relationship. This keeps the payments module decoupled from the user module (Constitution Principle V — Git Worktree Awareness). Join queries are performed in the service layer if needed.

### Validation Rules

| Field | Rule | Source |
|-------|------|--------|
| `stripePaymentIntentId` | UNIQUE, NOT NULL | FR-001, FR-002 |
| `amount` | NOT NULL, > 0 | FR-002, US1 scenario 3 |
| `currency` | NOT NULL, default 'usd' | FR-002 |
| `status` | Enum values only, NOT NULL | FR-005 |
| `description` | Required for creation (in DTO) | US1 scenario 4 |

### State Transitions

```
Created (status=pending)
    │
    ├── payment_intent.succeeded ──► Succeeded (status=succeeded)
    │                                    │
    │                                    └── charge.refunded ──► Refunded (status=refunded)
    │                                    └── admin refund ──► Refunded (status=refunded)
    │
    ├── payment_intent.payment_failed ──► Failed (status=failed)
    │
    └── (no delete — records are immutable)
```

**Valid transitions**:
- `pending` → `succeeded` (webhook: `payment_intent.succeeded`)
- `pending` → `failed` (webhook: `payment_intent.payment_failed`)
- `succeeded` → `refunded` (webhook: `charge.refunded` OR admin action)

**Invalid transitions** (silently ignored by webhook handler):
- `refunded` → any
- `failed` → any (except re-creation as new intent)
- `succeeded` → `pending`
- `succeeded` → `failed`

## DTO Definitions

### CreatePaymentIntentDto

```typescript
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
```

### PaymentFilterDto

```typescript
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
```

## Migration

A TypeORM migration will be generated to create the `payments` table with all columns and indexes defined above.

```bash
npm run migration:generate --name=CreatePaymentsTable
```
