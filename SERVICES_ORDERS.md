# Services Orders — Integration Plan
> Payments × Services Module Integration | NestJS Backend + Next.js Frontend

---

## Overview

This document outlines the full integration between the existing `Payments` and `Services` modules to enable a complete **service ordering workflow** — from browsing, ordering, and paying, to real-time order tracking for both users and admins.

The integration introduces a new **`ServiceOrders` module** that bridges the two existing modules without modifying their core logic.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        NestJS Backend                           │
│                                                                 │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────┐ │
│  │   Services   │    │  ServiceOrders   │    │   Payments   │ │
│  │   Module     │◄───│     Module       │───►│   Module     │ │
│  │              │    │  (NEW - Bridge)  │    │  (Stripe)    │ │
│  └──────────────┘    └────────┬─────────┘    └──────────────┘ │
│                               │                                 │
│                        ┌──────▼──────┐                         │
│                        │  Webhook    │                          │
│                        │  Handler    │◄── Stripe Events        │
│                        └─────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### New Tables

#### `service_orders`
| Column           | Type          | Constraints                              | Notes                                   |
|------------------|---------------|------------------------------------------|-----------------------------------------|
| `id`             | uuid (PK)     | PRIMARY KEY, default: gen_random_uuid()  |                                         |
| `user_id`        | uuid          | NOT NULL, FK → `users.id`               | Order owner                             |
| `service_id`     | uuid          | NOT NULL, FK → `services.id`            | Ordered service                         |
| `payment_id`     | uuid          | NULLABLE, unique, FK → `payments.id`    | Linked after payment initiation         |
| `status`         | enum          | NOT NULL, default: `pending`            | `pending\|paid\|in_progress\|completed\|cancelled` |
| `amount`         | decimal(12,2) | NOT NULL                                | Copied from service.basePrice at time of order |
| `currency`       | varchar(10)   | NOT NULL, default: `usd`                |                                         |
| `notes`          | text          | NULLABLE                                | User-provided notes at order time       |
| `created_at`     | timestamp     | DEFAULT now()                           |                                         |
| `updated_at`     | timestamp     | DEFAULT now(), auto-update              |                                         |

**Indexes:**
- `(user_id)` — for fetching user's orders
- `(service_id)` — for service analytics
- `(status)` — for admin filtering
- `(payment_id)` — unique, for webhook lookup

---

#### `order_updates`
| Column       | Type      | Constraints                | Notes                          |
|--------------|-----------|----------------------------|--------------------------------|
| `id`         | uuid (PK) | PRIMARY KEY                |                                |
| `order_id`   | uuid      | NOT NULL, FK → `service_orders.id` ON DELETE CASCADE | Parent order |
| `author`     | enum      | NOT NULL                   | `user\|admin\|system`          |
| `content`    | text      | NOT NULL                   | The timeline message           |
| `created_at` | timestamp | DEFAULT now()              |                                |

**Indexes:**
- `(order_id, created_at DESC)` — for timeline pagination

---

### Modified — `payments` table
Add one nullable column:

| Column      | Type | Constraints           | Notes                  |
|-------------|------|-----------------------|------------------------|
| `order_id`  | uuid | NULLABLE, FK → `service_orders.id` | Backlink for webhook resolution |

> **Implementation Note:** Rather than modifying the `Payment` entity directly, we use the `metadata` JSONB field (already present on `Payment`) to store `{ orderId: "..." }`. This avoids touching the existing Payments module and preserves backward compatibility.

---

## Entity Relationships

```
User ──────────────────────────────────────────────────────┐
  │                                                         │
  │ 1:N                                                     │
  ▼                                                         │
ServiceOrder ──────────── 1:1 ──────────────► Payment      │
  │                                                         │
  │ N:1                                                     │
  ▼                                                         │
Service                                                     │
  │                                                         │
  │ 1:N                                                     │
  ▼                                                         │
OrderUpdate (Timeline)                                      │
```

---

## Enums

### `OrderStatus`
```typescript
// src/service-orders/enums/order-status.enum.ts
export enum OrderStatus {
  PENDING     = 'pending',      // Created, awaiting payment
  PAID        = 'paid',         // Payment confirmed via webhook
  IN_PROGRESS = 'in_progress',  // Admin started working
  COMPLETED   = 'completed',    // Delivered
  CANCELLED   = 'cancelled',    // Cancelled by user or admin
}
```

### `UpdateAuthor`
```typescript
// src/service-orders/enums/update-author.enum.ts
export enum UpdateAuthor {
  USER   = 'user',
  ADMIN  = 'admin',
  SYSTEM = 'system',
}
```

---

## Module Structure

```
src/
└── service-orders/
    ├── schema/
    │   ├── service-order.schema.ts        ← TypeORM entity
    │   └── order-update.schema.ts         ← TypeORM entity
    ├── dto/
    │   ├── create-order.dto.ts            ← User creates order
    │   ├── initiate-payment.dto.ts        ← Initiate payment for order
    │   ├── update-order-status.dto.ts     ← Admin updates status
    │   ├── add-order-update.dto.ts        ← Admin/user adds timeline note
    │   ├── order-filter.dto.ts            ← Admin list filters
    │   └── order-response.dto.ts          ← Serialized response
    ├── enums/
    │   ├── order-status.enum.ts
    │   └── update-author.enum.ts
    ├── service-orders.service.ts          ← Core business logic
    ├── service-orders.controller.ts       ← Admin routes
    ├── service-orders.client.controller.ts ← User routes
    ├── service-orders.module.ts
    └── service-orders.events.ts           ← Internal event constants (optional)
```

---

## API Endpoints

### User Routes — `service-orders.client.controller.ts`
> Auth: `AuthGuard` (any authenticated user), `@CurrentUser()` used to scope orders

| Method | Path                                    | Description                        |
|--------|-----------------------------------------|------------------------------------|
| POST   | `/orders`                               | Create a new service order         |
| POST   | `/orders/:id/pay`                       | Initiate payment for an order      |
| GET    | `/orders`                               | List current user's orders         |
| GET    | `/orders/:id`                           | Get single order with timeline     |

### Admin Routes — `service-orders.controller.ts`
> Auth: `AuthGuard` + `RolesGuard` + `@Roles(UserRoleEnum.ADMIN)`

| Method | Path                                    | Description                        |
|--------|-----------------------------------------|------------------------------------|
| GET    | `/admin/orders`                         | List all orders (filterable)       |
| GET    | `/admin/orders/:id`                     | Get full order details             |
| PATCH  | `/admin/orders/:id/status`              | Update order status                |
| POST   | `/admin/orders/:id/updates`             | Add a timeline update              |

### Webhook (Stripe) — extend `PaymentsWebhookController`
> The existing webhook on `POST /api/stripe/webhook` will emit a NestJS event when payment succeeds. `ServiceOrdersModule` subscribes and updates the linked order status to `paid`.

---

## Data Flow

```
User                    Backend                           Stripe
 │                         │                                │
 │──POST /orders──────────►│                                │
 │                         │  Validate serviceId exists     │
 │                         │  Create ServiceOrder (PENDING) │
 │◄──{ orderId, amount }───│                                │
 │                         │                                │
 │──POST /orders/:id/pay──►│                                │
 │                         │  Check: order is PENDING       │
 │                         │  Check: no existing payment    │
 │                         │  Call PaymentsService          │
 │                         │    .createPaymentIntent(...)   │
 │                         │  Store metadata: { orderId }   │
 │                         │──Create PaymentIntent─────────►│
 │◄──{ clientSecret }──────│◄──────────────────────────────│
 │                         │                                │
 │──stripe.confirmCard()──────────────────────────────────►│
 │                         │                                │
 │                         │◄──payment_intent.succeeded────│
 │                         │  (POST /api/stripe/webhook)   │
 │                         │  Lookup payment by intentId   │
 │                         │  Read metadata.orderId        │
 │                         │  Update OrderStatus → PAID    │
 │                         │  Create system OrderUpdate    │
 │◄──(poll/ws) PAID status─│                                │
```

---

## NestJS Implementation

### Entity — `ServiceOrder`
```typescript
// src/service-orders/schema/service-order.schema.ts
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, OneToMany, OneToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../user/schema/user.schema';
import { Service } from '../../services/schema/service.schema';
import { Payment } from '../../payments/schema/payment.schema';
import { OrderUpdate } from './order-update.schema';
import { OrderStatus } from '../enums/order-status.enum';

@Entity('service_orders')
@Index(['userId'])
@Index(['serviceId'])
@Index(['status'])
export class ServiceOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid', name: 'service_id' })
  serviceId: string;

  @ManyToOne(() => Service, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'service_id' })
  service: Service;

  @Column({ type: 'uuid', name: 'payment_id', nullable: true, unique: true })
  paymentId: string | null;

  @OneToOne(() => Payment, { nullable: true, eager: false })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment | null;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'usd' })
  currency: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => OrderUpdate, (update) => update.order, { cascade: true })
  updates: OrderUpdate[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### Entity — `OrderUpdate`
```typescript
// src/service-orders/schema/order-update.schema.ts
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { ServiceOrder } from './service-order.schema';
import { UpdateAuthor } from '../enums/update-author.enum';

@Entity('order_updates')
@Index(['orderId', 'createdAt'])
export class OrderUpdate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @ManyToOne(() => ServiceOrder, (order) => order.updates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: ServiceOrder;

  @Column({ type: 'enum', enum: UpdateAuthor })
  author: UpdateAuthor;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

---

### DTOs

#### `CreateOrderDto`
```typescript
// src/service-orders/dto/create-order.dto.ts
import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({ description: 'UUID of the service to order' })
  @IsUUID()
  serviceId: string;

  @ApiPropertyOptional({ description: 'Optional notes from the user' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
```

#### `UpdateOrderStatusDto`
```typescript
// src/service-orders/dto/update-order-status.dto.ts
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../enums/order-status.enum';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
```

#### `AddOrderUpdateDto`
```typescript
// src/service-orders/dto/add-order-update.dto.ts
import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddOrderUpdateDto {
  @ApiProperty({ description: 'Timeline message content' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;
}
```

#### `OrderFilterDto`
```typescript
// src/service-orders/dto/order-filter.dto.ts
import { IsOptional, IsEnum, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../enums/order-status.enum';

export class OrderFilterDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serviceId?: string;
}
```

---

### Service — `ServiceOrdersService`
```typescript
// src/service-orders/service-orders.service.ts
import {
  Injectable, NotFoundException, BadRequestException,
  ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceOrder } from './schema/service-order.schema';
import { OrderUpdate } from './schema/order-update.schema';
import { Service } from '../services/schema/service.schema';
import { Payment } from '../payments/schema/payment.schema';
import { PaymentsService } from '../payments/payments.service';
import { OrderStatus } from './enums/order-status.enum';
import { UpdateAuthor } from './enums/update-author.enum';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AddOrderUpdateDto } from './dto/add-order-update.dto';
import { OrderFilterDto } from './dto/order-filter.dto';

@Injectable()
export class ServiceOrdersService {
  private readonly logger = new Logger(ServiceOrdersService.name);

  constructor(
    @InjectRepository(ServiceOrder)
    private readonly orderRepo: Repository<ServiceOrder>,
    @InjectRepository(OrderUpdate)
    private readonly updateRepo: Repository<OrderUpdate>,
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly paymentsService: PaymentsService,
  ) {}

  // ──────────────────────────────────────────────────────────────────
  // User: Create Order
  // ──────────────────────────────────────────────────────────────────

  async createOrder(userId: string, dto: CreateOrderDto): Promise<ServiceOrder> {
    const service = await this.serviceRepo.findOne({
      where: { id: dto.serviceId, isPublished: true },
    });

    if (!service) {
      throw new NotFoundException(`Service "${dto.serviceId}" not found or unavailable`);
    }

    const order = this.orderRepo.create({
      userId,
      serviceId: service.id,
      status: OrderStatus.PENDING,
      amount: service.basePrice,
      currency: 'usd',
      notes: dto.notes ?? null,
    });

    const saved = await this.orderRepo.save(order);

    // System timeline entry
    await this.updateRepo.save(
      this.updateRepo.create({
        orderId: saved.id,
        author: UpdateAuthor.SYSTEM,
        content: `Order created for service "${service.title}".`,
      }),
    );

    return saved;
  }

  // ──────────────────────────────────────────────────────────────────
  // User: Initiate Payment
  // ──────────────────────────────────────────────────────────────────

  async initiatePayment(
    userId: string,
    orderId: string,
  ): Promise<{ clientSecret: string; paymentId: string; stripePaymentIntentId: string }> {
    const order = await this.findOrderForUser(userId, orderId);

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Cannot initiate payment: order status is "${order.status}". Only pending orders can be paid.`,
      );
    }

    if (order.paymentId) {
      throw new BadRequestException(
        'Payment already initiated for this order. Check current payment status.',
      );
    }

    const result = await this.paymentsService.createPaymentIntent({
      amount: order.amount,
      currency: order.currency,
      description: `Service Order: ${order.service?.title ?? order.serviceId}`,
      userId,
    });

    // Store orderId in payment metadata for webhook resolution
    await this.paymentRepo.update(result.paymentId, {
      metadata: { orderId: order.id },
    });

    // Link payment to order
    order.paymentId = result.paymentId;
    await this.orderRepo.save(order);

    await this.updateRepo.save(
      this.updateRepo.create({
        orderId: order.id,
        author: UpdateAuthor.SYSTEM,
        content: 'Payment initiated. Awaiting confirmation from payment gateway.',
      }),
    );

    return result;
  }

  // ──────────────────────────────────────────────────────────────────
  // Webhook: Mark order as PAID (called after Stripe confirms payment)
  // ──────────────────────────────────────────────────────────────────

  async markOrderAsPaid(orderId: string): Promise<void> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });

    if (!order) {
      this.logger.warn(`markOrderAsPaid: Order ${orderId} not found. Skipping.`);
      return;
    }

    if (order.status === OrderStatus.PAID) {
      this.logger.debug(`Order ${orderId} already paid. Idempotent skip.`);
      return;
    }

    order.status = OrderStatus.PAID;
    await this.orderRepo.save(order);

    await this.updateRepo.save(
      this.updateRepo.create({
        orderId: order.id,
        author: UpdateAuthor.SYSTEM,
        content: 'Payment confirmed. Your order is now being processed.',
      }),
    );

    this.logger.log(`Order ${orderId} marked as PAID`);
  }

  // ──────────────────────────────────────────────────────────────────
  // User: List My Orders
  // ──────────────────────────────────────────────────────────────────

  async findUserOrders(userId: string, page: number = 1, limit: number = 10) {
    const [data, total] = await this.orderRepo.findAndCount({
      where: { userId },
      relations: ['service', 'updates'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // User: Get Single Order (ownership check)
  // ──────────────────────────────────────────────────────────────────

  async findOneForUser(userId: string, orderId: string): Promise<ServiceOrder> {
    return this.findOrderForUser(userId, orderId);
  }

  // ──────────────────────────────────────────────────────────────────
  // Admin: List All Orders
  // ──────────────────────────────────────────────────────────────────

  async findAll(query: OrderFilterDto) {
    const { page = 1, limit = 10, status, userId, serviceId } = query;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (serviceId) where.serviceId = serviceId;

    const [data, total] = await this.orderRepo.findAndCount({
      where,
      relations: ['service', 'user', 'updates'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // Admin: Get Single Order
  // ──────────────────────────────────────────────────────────────────

  async findOneAdmin(orderId: string): Promise<ServiceOrder> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['service', 'user', 'updates', 'payment'],
    });

    if (!order) throw new NotFoundException(`Order "${orderId}" not found`);
    return order;
  }

  // ──────────────────────────────────────────────────────────────────
  // Admin: Update Order Status
  // ──────────────────────────────────────────────────────────────────

  async updateStatus(orderId: string, dto: UpdateOrderStatusDto): Promise<ServiceOrder> {
    const order = await this.findOneAdmin(orderId);
    const prevStatus = order.status;

    order.status = dto.status;
    await this.orderRepo.save(order);

    await this.updateRepo.save(
      this.updateRepo.create({
        orderId: order.id,
        author: UpdateAuthor.ADMIN,
        content: `Order status changed from "${prevStatus}" to "${dto.status}".`,
      }),
    );

    return order;
  }

  // ──────────────────────────────────────────────────────────────────
  // Admin: Add Timeline Update
  // ──────────────────────────────────────────────────────────────────

  async addUpdate(orderId: string, dto: AddOrderUpdateDto): Promise<OrderUpdate> {
    const order = await this.findOneAdmin(orderId);

    const update = this.updateRepo.create({
      orderId: order.id,
      author: UpdateAuthor.ADMIN,
      content: dto.content,
    });

    return this.updateRepo.save(update);
  }

  // ──────────────────────────────────────────────────────────────────
  // Private Helpers
  // ──────────────────────────────────────────────────────────────────

  private async findOrderForUser(userId: string, orderId: string): Promise<ServiceOrder> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['service', 'updates'],
    });

    if (!order) throw new NotFoundException(`Order "${orderId}" not found`);
    if (order.userId !== userId) throw new ForbiddenException('Access denied');

    return order;
  }
}
```

---

### Webhook Integration

The existing `PaymentsWebhookController` needs a single change: after updating the payment status to `SUCCEEDED`, emit an internal event or call a callback that the `ServiceOrdersService` handles.

**Recommended approach: NestJS EventEmitter**

```typescript
// In payments.webhook.controller.ts — after event.type === 'payment_intent.succeeded':

// 1. After payment status is updated to SUCCEEDED, the payment metadata contains { orderId }
// 2. Resolve orderId from metadata
// 3. Emit event: this.eventEmitter.emit('payment.succeeded', { orderId })
```

```typescript
// In service-orders.service.ts — add event listener:
import { OnEvent } from '@nestjs/event-emitter';

@OnEvent('payment.succeeded')
async handlePaymentSucceeded(payload: { orderId?: string }) {
  if (!payload.orderId) return;
  await this.markOrderAsPaid(payload.orderId);
}
```

**Alternative (simpler):** Modify `handlePaymentIntentSucceeded` in `payments.service.ts` to call `serviceOrdersService.markOrderAsPaid(payment.metadata?.orderId)` via injected dependency (requires circular-dep guard via `forwardRef`).

> **Recommendation:** Use `@nestjs/event-emitter` — it avoids circular dependencies and is cleaner.

---

### Module — `ServiceOrdersModule`
```typescript
// src/service-orders/service-orders.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceOrder } from './schema/service-order.schema';
import { OrderUpdate } from './schema/order-update.schema';
import { Service } from '../services/schema/service.schema';
import { Payment } from '../payments/schema/payment.schema';
import { PaymentsModule } from '../payments/payments.module';
import { AuthModule } from '../auth/auth.module';
import { ServiceOrdersService } from './service-orders.service';
import { ServiceOrdersController } from './service-orders.controller';
import { ServiceOrdersClientController } from './service-orders.client.controller';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceOrder, OrderUpdate, Service, Payment]),
    PaymentsModule,
    AuthModule,
  ],
  controllers: [ServiceOrdersController, ServiceOrdersClientController],
  providers: [ServiceOrdersService, AuthGuard, RolesGuard],
  exports: [ServiceOrdersService],
})
export class ServiceOrdersModule {}
```

> **Note:** `PaymentsModule` must export `PaymentsService`. Add `exports: [PaymentsService]` to `PaymentsModule`.

---

## Security & Validation

| Concern                        | Solution                                                                   |
|-------------------------------|----------------------------------------------------------------------------|
| JWT authentication             | `AuthGuard` on all routes (already applied globally via `APP_GUARD`)      |
| Role separation                | `RolesGuard` + `@Roles(UserRoleEnum.ADMIN)` on admin routes               |
| Order ownership                | `findOrderForUser()` throws `ForbiddenException` if `userId` doesn't match |
| Prevent double payment         | Check `order.paymentId !== null` before creating payment intent            |
| Prevent wrong status payment   | Check `order.status === PENDING` before initiating payment                 |
| Webhook authenticity           | Stripe signature verification (already in `PaymentsWebhookController`)    |
| Webhook idempotency            | `markOrderAsPaid()` checks if already `PAID` before updating              |
| Input validation               | `class-validator` on all DTOs                                              |
| SQL injection                  | TypeORM parameterized queries                                              |

---

## Frontend Integration (Next.js)

### Page Structure
```
app/
└── (user)/
    ├── services/
    │   └── page.tsx                  ← Browse published services
    ├── services/[slug]/
    │   └── page.tsx                  ← Service detail + "Order Now" CTA
    ├── orders/
    │   ├── new/
    │   │   └── page.tsx              ← Order confirmation page
    │   └── page.tsx                  ← User order dashboard
    └── orders/[id]/
        └── page.tsx                  ← Order detail + timeline
```

### API Integration Examples

#### 1. Browse Services
```typescript
// app/(user)/services/page.tsx
const services = await fetch('/api/public/services').then(r => r.json());
```

#### 2. Create Order
```typescript
// POST /orders
const order = await fetch('/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ serviceId, notes }),
}).then(r => r.json());
```

#### 3. Initiate Payment
```typescript
// POST /orders/:id/pay
const { clientSecret } = await fetch(`/orders/${orderId}/pay`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
}).then(r => r.json());

// Then use Stripe.js
const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY!);
const { error } = await stripe!.confirmCardPayment(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: { name: user.name },
  },
});
```

#### 4. Poll Order Status (or use WebSocket)
```typescript
// Using react-query for polling
const { data: order } = useQuery({
  queryKey: ['order', orderId],
  queryFn: () => fetch(`/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json()),
  refetchInterval: order?.status === 'pending' ? 3000 : false,
});
```

#### 5. Admin — List All Orders
```typescript
// GET /admin/orders?page=1&limit=10&status=pending
const { data, meta } = await fetch('/admin/orders?status=pending', {
  headers: { Authorization: `Bearer ${adminToken}` },
}).then(r => r.json());
```

#### 6. Admin — Update Status
```typescript
// PATCH /admin/orders/:id/status
await fetch(`/admin/orders/${orderId}/status`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  },
  body: JSON.stringify({ status: 'in_progress' }),
});
```

---

## Step-by-Step Implementation Plan

### Phase 1 — Foundation
- [ ] Create `src/service-orders/enums/order-status.enum.ts`
- [ ] Create `src/service-orders/enums/update-author.enum.ts`
- [ ] Create `src/service-orders/schema/service-order.schema.ts`
- [ ] Create `src/service-orders/schema/order-update.schema.ts`

### Phase 2 — DTOs
- [ ] Create `create-order.dto.ts`
- [ ] Create `update-order-status.dto.ts`
- [ ] Create `add-order-update.dto.ts`
- [ ] Create `order-filter.dto.ts`
- [ ] Create `order-response.dto.ts`

### Phase 3 — Core Service
- [ ] Create `service-orders.service.ts` with all methods
- [ ] Add `exports: [PaymentsService]` to `PaymentsModule`

### Phase 4 — Controllers
- [ ] Create `service-orders.client.controller.ts` (user routes)
- [ ] Create `service-orders.controller.ts` (admin routes)
- [ ] Create `service-orders.module.ts`
- [ ] Register `ServiceOrdersModule` in `app.module.ts`

### Phase 5 — Webhook Integration
- [ ] Install `@nestjs/event-emitter`: `npm install @nestjs/event-emitter`
- [ ] Register `EventEmitterModule.forRoot()` in `app.module.ts`
- [ ] Inject `EventEmitter2` in `PaymentsService`
- [ ] Emit `payment.succeeded` event in `handlePaymentIntentSucceeded()`
- [ ] Add `@OnEvent('payment.succeeded')` listener in `ServiceOrdersService`

### Phase 6 — TypeORM Migration
- [ ] Generate migration: `npm run migration:generate -- -n ServiceOrders`
- [ ] Review and run migration: `npm run migration:run`

### Phase 7 — Frontend
- [ ] Services listing page (uses existing public API)
- [ ] Order creation page with `<ServiceOrderForm>`
- [ ] Add Stripe.js integration for payment confirmation
- [ ] User orders dashboard with polling for status
- [ ] Admin orders management page

### Phase 8 — Testing
- [ ] Unit tests for `ServiceOrdersService` (mock repos + PaymentsService)
- [ ] Integration tests for order → payment → webhook flow
- [ ] E2E: full user flow from service browse → order → pay → status update

---

## Open Questions / Decisions

| # | Question | Recommendation |
|---|----------|----------------|
| 1 | Should cancelled orders be deletable? | No — soft status, keep for audit trail |
| 2 | Can users cancel their own PENDING orders? | Yes — add `DELETE /orders/:id` or `PATCH /orders/:id/cancel` |
| 3 | Should `amount` snapshot the price at order time? | Yes (already in plan) — prevents price changes affecting existing orders |
| 4 | Multi-service orders (cart)? | Out of scope for now — the existing `CartModule` may handle this separately |
| 5 | Real-time updates (WebSocket)? | Polling is sufficient initially; WebSocket can be added later via `@nestjs/websockets` |
| 6 | Email notifications on status change? | Inject `MailService` into `ServiceOrdersService` and send transactional emails |

---

*Generated: 2026-04-09 | Backend: NestJS + TypeORM + Stripe | Frontend: Next.js + React Query*
