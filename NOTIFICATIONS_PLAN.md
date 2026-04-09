# 🔔 Real-Time Notification System — Backend Architecture Plan

> **Stack:** NestJS 11 · TypeORM · PostgreSQL · Socket.IO · Redis · BullMQ  
> **Scope:** Backend only — no frontend code included  
> **Principles:** Clean Architecture · SOLID · Event-Driven · Production-Ready

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema](#2-database-schema)
3. [Module Structure](#3-module-structure)
4. [WebSocket Gateway](#4-websocket-gateway)
5. [Service Layer](#5-service-layer)
6. [REST API Endpoints](#6-rest-api-endpoints)
7. [DTOs](#7-dtos)
8. [Event-Driven Integration](#8-event-driven-integration)
9. [Scalability & Performance](#9-scalability--performance)
10. [Security](#10-security)
11. [Step-by-Step Implementation Plan](#11-step-by-step-implementation-plan)

---

## 1. Architecture Overview

```
                           ┌─────────────────────────────────────────────────────┐
                           │                   NestJS Application                │
                           │                                                     │
  ┌──────────────┐         │  ┌────────────┐    ┌───────────────────────────┐   │
  │  REST Client │◄────────┤  │Notification│    │   NotificationGateway     │   │
  │  (HTTP API)  │         │  │Controller  │    │   (Socket.IO WebSocket)   │   │
  └──────────────┘         │  └─────┬──────┘    └───────────┬───────────────┘   │
                           │        │                        │                   │
  ┌──────────────┐         │        ▼                        ▼                   │
  │ Socket Client│◄────────┤  ┌─────────────────────────────────────┐           │
  │  (WS/WSS)   │         │  │          NotificationService          │           │
  └──────────────┘         │  └──────┬──────────────────────┬───────┘           │
                           │         │                       │                   │
                           │         ▼                       ▼                   │
                           │  ┌─────────────┐    ┌──────────────────────┐       │
                           │  │  PostgreSQL  │    │  BullMQ Queue        │       │
                           │  │  (TypeORM)  │    │  (notification jobs) │       │
                           │  └─────────────┘    └──────────┬───────────┘       │
                           │                                 │                   │
                           │                     ┌───────────▼───────────┐       │
                           │                     │     Redis Adapter      │       │
                           │                     │  (Socket.IO cluster)  │       │
                           │                     └───────────────────────┘       │
                           └─────────────────────────────────────────────────────┘
                                    ▲                    ▲
                                    │ EventEmitter2      │ EventEmitter2
                           ┌────────┴──────┐    ┌────────┴──────┐
                           │ OrdersModule  │    │PaymentsModule │
                           └───────────────┘    └───────────────┘
```

### Key Design Decisions

| Concern | Decision | Rationale |
|---|---|---|
| Real-time transport | Socket.IO | Supports rooms, namespaces, fallback transports |
| DB persistence | PostgreSQL via TypeORM | Already in use across the project |
| Cross-instance sync | Redis Socket.IO Adapter | Enables horizontal scaling |
| Heavy fanout / bulk | BullMQ queue | Decouples emit from main thread |
| Inter-module events | `@nestjs/event-emitter` (EventEmitter2) | Lightweight, no infra overhead for internal events |
| Auth on WS | JWT via handshake query/header | Consistent with the existing `AuthGuard` strategy |

---

## 2. Database Schema

### 2.1 Notification Entity — `notifications`

```typescript
// src/notifications/schema/notification.schema.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NotificationType } from '../enums/notification-type.enum';
import { User } from '../../user/schema/user.schema';

@Entity('notifications')
@Index(['userId'])
@Index(['type'])
@Index(['isRead'])
@Index(['createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** null = broadcast to all users */
  @Column({ type: 'int', name: 'user_id', nullable: true })
  userId: number | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  /** Flexible payload — e.g. { orderId, paymentId, link } */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /** Soft delete support */
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
```

### 2.2 NotificationPreferences Entity — `notification_preferences`

```typescript
// src/notifications/schema/notification-preferences.schema.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/schema/user.schema';

@Entity('notification_preferences')
export class NotificationPreferences {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', name: 'user_id', unique: true })
  userId: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** Master toggle — if false, no real-time WS delivery */
  @Column({ name: 'real_time_enabled', default: true })
  realTimeEnabled: boolean;

  @Column({ name: 'order_updates', default: true })
  orderUpdates: boolean;

  @Column({ name: 'payment_updates', default: true })
  paymentUpdates: boolean;

  @Column({ name: 'admin_messages', default: true })
  adminMessages: boolean;

  @Column({ name: 'system_notifications', default: true })
  systemNotifications: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### 2.3 Enums

```typescript
// src/notifications/enums/notification-type.enum.ts
export enum NotificationType {
  SYSTEM       = 'system',
  ORDER_UPDATE = 'order_update',
  PAYMENT      = 'payment',
  ADMIN        = 'admin',
  CUSTOM       = 'custom',
}
```

### 2.4 Migration Strategy

After creating entities, generate and run the migration:

```bash
npm run migration:generate -- db/migrations/AddNotificationsTable
npm run migration:run
```

---

## 3. Module Structure

```
src/notifications/
├── notifications.module.ts
├── notifications.controller.ts         # Admin endpoints
├── notifications.client.controller.ts  # User-facing endpoints
├── notifications.service.ts
├── notifications.gateway.ts            # Socket.IO WebSocket gateway
├── notifications.gateway.adapter.ts    # Redis adapter bootstrap helper
├── dto/
│   ├── create-notification.dto.ts
│   ├── send-to-user.dto.ts
│   ├── broadcast-notification.dto.ts
│   ├── update-preferences.dto.ts
│   └── paginate-notifications.dto.ts
├── enums/
│   └── notification-type.enum.ts
├── events/
│   └── notification.events.ts          # Event name constants
├── schema/
│   ├── notification.schema.ts
│   └── notification-preferences.schema.ts
└── interfaces/
    └── notification-payload.interface.ts
```

### 3.1 NotificationModule

```typescript
// src/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Notification } from './schema/notification.schema';
import { NotificationPreferences } from './schema/notification-preferences.schema';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsClientController } from './notifications.client.controller';
import { NotificationsGateway } from './notifications.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationPreferences]),
    BullModule.registerQueue({ name: 'notifications' }),
    AuthModule,
  ],
  controllers: [NotificationsController, NotificationsClientController],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService],  // ← so OrdersModule / PaymentsModule can inject it
})
export class NotificationsModule {}
```

---

## 4. WebSocket Gateway

### 4.1 Gateway Implementation

```typescript
// src/notifications/notifications.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { NotificationPayload } from './interfaces/notification-payload.interface';

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL, credentials: true },
  namespace: '/notifications',
  transports: ['websocket', 'polling'],
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  /** userId → Set<socketId> — handles multiple devices per user */
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(private readonly jwtService: JwtService) {}

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      const payload = await this.jwtService.verifyAsync<{
        id: string;
        email: string;
        role: string;
      }>(token);

      client.data.userId = String(payload.id);
      client.data.role   = payload.role;

      // Join personal room — room name = 'user:<userId>'
      const room = `user:${payload.id}`;
      await client.join(room);

      // Track socket
      if (!this.userSockets.has(room)) {
        this.userSockets.set(room, new Set());
      }
      this.userSockets.get(room)!.add(client.id);

      this.logger.log(`Client connected: ${client.id} → room ${room}`);
    } catch {
      this.logger.warn(`Unauthorized connection attempt: ${client.id}`);
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const room = `user:${client.data.userId}`;
    this.userSockets.get(room)?.delete(client.id);
    if (this.userSockets.get(room)?.size === 0) {
      this.userSockets.delete(room);
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ─── Emit Helpers ───────────────────────────────────────────────────────────

  /** Emit a notification to a specific user (all their devices) */
  emitToUser(userId: number, payload: NotificationPayload): void {
    this.server.to(`user:${userId}`).emit('notification', payload);
  }

  /** Broadcast to all connected clients */
  broadcast(payload: NotificationPayload): void {
    this.server.emit('notification', payload);
  }

  /** Admin-only broadcast to the 'admin' room */
  emitToAdmins(payload: NotificationPayload): void {
    this.server.to('admin').emit('notification', payload);
  }

  // ─── Client-Initiated Events ─────────────────────────────────────────────

  /** Client sends 'mark_read' event for instant optimistic UI */
  @SubscribeMessage('mark_read')
  handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: string },
  ): void {
    this.logger.debug(
      `mark_read from ${client.data.userId}: ${data.notificationId}`,
    );
    // Actual DB update handled via REST; this is for client acknowledgment
    client.emit('mark_read_ack', { id: data.notificationId, success: true });
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private extractToken(client: Socket): string {
    const authHeader = client.handshake.headers.authorization as string;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }
    const queryToken = client.handshake.query.token as string;
    if (queryToken) return queryToken;
    throw new UnauthorizedException('No token provided');
  }
}
```

### 4.2 Redis Adapter Setup (main.ts modification)

```typescript
// main.ts — add after app creation
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient }   from 'redis';
import { IoAdapter }      from '@nestjs/platform-socket.io';

class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: any) {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}

// In bootstrap():
const redisIoAdapter = new RedisIoAdapter(app);
await redisIoAdapter.connectToRedis();
app.useWebSocketAdapter(redisIoAdapter);
```

---

## 5. Service Layer

```typescript
// src/notifications/notifications.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Notification } from './schema/notification.schema';
import { NotificationPreferences } from './schema/notification-preferences.schema';
import { NotificationsGateway } from './notifications.gateway';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { PaginateNotificationsDto } from './dto/paginate-notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,

    @InjectRepository(NotificationPreferences)
    private readonly prefsRepo: Repository<NotificationPreferences>,

    private readonly gateway: NotificationsGateway,

    @InjectQueue('notifications')
    private readonly notificationsQueue: Queue,
  ) {}

  // ─── Create & Deliver ───────────────────────────────────────────────────────

  /**
   * Core method — saves to DB and emits in real time.
   * Called internally by event listeners (Orders, Payments) or admin endpoints.
   */
  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepo.create(dto);
    const saved = await this.notificationRepo.save(notification);

    const payload = {
      id:        saved.id,
      title:     saved.title,
      message:   saved.message,
      type:      saved.type,
      isRead:    saved.isRead,
      metadata:  saved.metadata,
      createdAt: saved.createdAt,
    };

    if (saved.userId) {
      // Check preferences before emitting
      const prefs = await this.prefsRepo.findOne({ where: { userId: saved.userId } });
      const shouldEmit = !prefs || prefs.realTimeEnabled;
      if (shouldEmit) {
        this.gateway.emitToUser(saved.userId, payload);
      }
    } else {
      // Broadcast
      this.gateway.broadcast(payload);
    }

    return saved;
  }

  /**
   * Queue-based bulk notification creation — used for heavy fanout scenarios
   * e.g., send announcement to 10,000 users.
   */
  async enqueueBulk(
    dto: CreateNotificationDto,
    userIds: number[],
  ): Promise<void> {
    await this.notificationsQueue.add('bulk-notify', { dto, userIds });
  }

  // ─── User Queries ───────────────────────────────────────────────────────────

  async findAllForUser(
    userId: number,
    { page = 1, limit = 20 }: PaginateNotificationsDto,
  ): Promise<{ data: Notification[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.notificationRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      withDeleted: false,
    });
    return { data, total, page, limit };
  }

  async countUnread(userId: number): Promise<number> {
    return this.notificationRepo.count({ where: { userId, isRead: false } });
  }

  // ─── Mark Read ──────────────────────────────────────────────────────────────

  async markAsRead(notificationId: string, userId: number): Promise<Notification> {
    const notification = await this.findOneOrThrow(notificationId);
    this.assertOwnership(notification, userId);
    notification.isRead = true;
    return this.notificationRepo.save(notification);
  }

  async markAllAsRead(userId: number): Promise<{ affected: number }> {
    const result = await this.notificationRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true })
      .where('user_id = :userId AND is_read = false', { userId })
      .execute();
    return { affected: result.affected ?? 0 };
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────

  async softDelete(notificationId: string, userId: number): Promise<void> {
    const notification = await this.findOneOrThrow(notificationId);
    this.assertOwnership(notification, userId);
    await this.notificationRepo.softRemove(notification);
  }

  // ─── Preferences ────────────────────────────────────────────────────────────

  async getPreferences(userId: number): Promise<NotificationPreferences> {
    let prefs = await this.prefsRepo.findOne({ where: { userId } });
    if (!prefs) {
      prefs = await this.prefsRepo.save(this.prefsRepo.create({ userId }));
    }
    return prefs;
  }

  async updatePreferences(
    userId: number,
    updates: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    const prefs = await this.getPreferences(userId);
    Object.assign(prefs, updates);
    return this.prefsRepo.save(prefs);
  }

  // ─── Admin ──────────────────────────────────────────────────────────────────

  async adminSendToUser(dto: CreateNotificationDto): Promise<Notification> {
    return this.create(dto);
  }

  async adminBroadcast(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepo.create({ ...dto, userId: null });
    const saved = await this.notificationRepo.save(notification);
    this.gateway.broadcast({
      id: saved.id,
      title: saved.title,
      message: saved.message,
      type: saved.type,
      isRead: false,
      metadata: saved.metadata,
      createdAt: saved.createdAt,
    });
    return saved;
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private async findOneOrThrow(id: string): Promise<Notification> {
    const n = await this.notificationRepo.findOne({ where: { id } });
    if (!n) throw new NotFoundException(`Notification ${id} not found`);
    return n;
  }

  private assertOwnership(n: Notification, userId: number): void {
    if (n.userId !== null && n.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
  }
}
```

---

## 6. REST API Endpoints

### 6.1 User (Client) Endpoints — `NotificationsClientController`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/notifications` | JWT | Get paginated notifications for current user |
| `GET` | `/api/notifications/unread-count` | JWT | Count of unread notifications |
| `PATCH` | `/api/notifications/:id/read` | JWT | Mark a single notification as read |
| `PATCH` | `/api/notifications/read-all` | JWT | Mark all user's notifications as read |
| `DELETE` | `/api/notifications/:id` | JWT | Soft-delete a notification |
| `GET` | `/api/notifications/preferences` | JWT | Get notification preferences |
| `PATCH` | `/api/notifications/preferences` | JWT | Update notification preferences |

### 6.2 Admin Endpoints — `NotificationsController`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/admin/notifications/send` | JWT + Admin | Send notification to a specific user |
| `POST` | `/api/admin/notifications/broadcast` | JWT + Admin | Broadcast to all users |
| `GET` | `/api/admin/notifications` | JWT + Admin | List all notifications (paginated) |
| `DELETE` | `/api/admin/notifications/:id` | JWT + Admin | Hard delete a notification |

### 6.3 Client Controller Code

```typescript
// src/notifications/notifications.client.controller.ts
import {
  Controller, Get, Patch, Delete, Param, Query, Body,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PaginateNotificationsDto } from './dto/paginate-notifications.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Controller('notifications')
export class NotificationsClientController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getMyNotifications(
    @CurrentUser('id') userId: number,
    @Query() query: PaginateNotificationsDto,
  ) {
    return this.notificationsService.findAllForUser(userId, query);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser('id') userId: number) {
    return this.notificationsService.countUnread(userId);
  }

  @Patch(':id/read')
  markAsRead(
    @Param('id') id: string,
    @CurrentUser('id') userId: number,
  ) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser('id') userId: number) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  deleteNotification(
    @Param('id') id: string,
    @CurrentUser('id') userId: number,
  ) {
    return this.notificationsService.softDelete(id, userId);
  }

  @Get('preferences')
  getPreferences(@CurrentUser('id') userId: number) {
    return this.notificationsService.getPreferences(userId);
  }

  @Patch('preferences')
  updatePreferences(
    @CurrentUser('id') userId: number,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.notificationsService.updatePreferences(userId, dto);
  }
}
```

### 6.4 Admin Controller Code

```typescript
// src/notifications/notifications.controller.ts
import { Controller, Post, Get, Delete, Param, Body, Query } from '@nestjs/common';
import { Roles } from '../auth/decorators/Roles.decorator';
import { UserRoleEnum } from '../auth/types/UserRoleEnum';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { PaginateNotificationsDto } from './dto/paginate-notifications.dto';

@Controller('admin/notifications')
@Roles(UserRoleEnum.ADMIN)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('send')
  sendToUser(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.adminSendToUser(dto);
  }

  @Post('broadcast')
  broadcast(@Body() dto: BroadcastNotificationDto) {
    return this.notificationsService.adminBroadcast(dto);
  }

  @Get()
  findAll(@Query() query: PaginateNotificationsDto) {
    // return all notifications for admin dashboard
    return this.notificationsService.findAllForUser(0, query); // stub — adapt
  }
}
```

---

## 7. DTOs

```typescript
// src/notifications/dto/create-notification.dto.ts
import { IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { NotificationType } from '../enums/notification-type.enum';

export class CreateNotificationDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  message: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  /** If null → broadcast */
  @IsOptional()
  @IsInt()
  userId?: number | null;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
```

```typescript
// src/notifications/dto/paginate-notifications.dto.ts
import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginateNotificationsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
```

```typescript
// src/notifications/dto/update-preferences.dto.ts
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional() @IsBoolean() realTimeEnabled?: boolean;
  @IsOptional() @IsBoolean() orderUpdates?: boolean;
  @IsOptional() @IsBoolean() paymentUpdates?: boolean;
  @IsOptional() @IsBoolean() adminMessages?: boolean;
  @IsOptional() @IsBoolean() systemNotifications?: boolean;
}
```

```typescript
// src/notifications/interfaces/notification-payload.interface.ts
import { NotificationType } from '../enums/notification-type.enum';

export interface NotificationPayload {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}
```

---

## 8. Event-Driven Integration

### 8.1 Event Constants

```typescript
// src/notifications/events/notification.events.ts
export const NOTIFICATION_EVENTS = {
  ORDER_UPDATED:   'notification.order.updated',
  PAYMENT_SUCCESS: 'notification.payment.success',
  PAYMENT_FAILED:  'notification.payment.failed',
  ADMIN_MESSAGE:   'notification.admin.message',
  SYSTEM:          'notification.system',
} as const;
```

### 8.2 Install EventEmitter2

```bash
npm install @nestjs/event-emitter
```

Register in `AppModule`:

```typescript
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    // ...existing imports...
    EventEmitterModule.forRoot(),
    NotificationsModule,
  ],
})
export class AppModule {}
```

### 8.3 Emitting From OrdersModule

When an order status is updated, emit an internal event:

```typescript
// src/orders/orders.service.ts (simplified)
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NOTIFICATION_EVENTS } from '../notifications/events/notification.events';
import { NotificationType } from '../notifications/enums/notification-type.enum';

@Injectable()
export class OrdersService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async updateOrderStatus(orderId: string, status: string, userId: number) {
    // ... update order in DB ...

    this.eventEmitter.emit(NOTIFICATION_EVENTS.ORDER_UPDATED, {
      userId,
      title: 'Order Updated',
      message: `Your order #${orderId} status changed to ${status}.`,
      type: NotificationType.ORDER_UPDATE,
      metadata: { orderId, status },
    });
  }
}
```

### 8.4 Emitting From PaymentsModule

```typescript
// src/payments/payments.service.ts (add to existing webhook handler)
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NOTIFICATION_EVENTS } from '../notifications/events/notification.events';
import { NotificationType } from '../notifications/enums/notification-type.enum';

// In the payment success handler (e.g., Stripe webhook):
this.eventEmitter.emit(NOTIFICATION_EVENTS.PAYMENT_SUCCESS, {
  userId: payment.userId,
  title: 'Payment Successful',
  message: `Your payment of $${payment.amount} was processed successfully.`,
  type: NotificationType.PAYMENT,
  metadata: { paymentId: payment.id, amount: payment.amount },
});
```

### 8.5 Notification Event Listener

```typescript
// src/notifications/notifications.service.ts — add listener
import { OnEvent } from '@nestjs/event-emitter';
import { NOTIFICATION_EVENTS } from './events/notification.events';

// Inside NotificationsService class:

@OnEvent(NOTIFICATION_EVENTS.ORDER_UPDATED)
async handleOrderUpdated(payload: CreateNotificationDto): Promise<void> {
  await this.create(payload);
}

@OnEvent(NOTIFICATION_EVENTS.PAYMENT_SUCCESS)
async handlePaymentSuccess(payload: CreateNotificationDto): Promise<void> {
  await this.create(payload);
}

@OnEvent(NOTIFICATION_EVENTS.PAYMENT_FAILED)
async handlePaymentFailed(payload: CreateNotificationDto): Promise<void> {
  await this.create(payload);
}
```

### 8.6 Full Data Flow

```
1. Order status changes in OrdersService
         │
         ▼
2. eventEmitter.emit(NOTIFICATION_EVENTS.ORDER_UPDATED, payload)
         │
         ▼
3. @OnEvent handler in NotificationsService picks it up
         │
         ▼
4. NotificationsService.create(dto)
         │
    ┌────┴─────────┐
    ▼              ▼
5a. Save to       5b. Check user preferences
    PostgreSQL         │
    (TypeORM)          ▼
                  5c. gateway.emitToUser(userId, payload)
                       │
                       ▼
                  6. Socket.IO delivers to all user's connected devices
                  (Room: 'user:<userId>')
                       │
                       ▼
                  7. Client receives 'notification' event
                       │
                       ▼
                  8. User reads notification → PATCH /notifications/:id/read
                       │
                       ▼
                  9. isRead = true in DB
```

---

## 9. Scalability & Performance

### 9.1 Redis Socket.IO Adapter

Required for horizontal scaling (multiple NestJS instances all share the same Socket.IO state via Redis pub/sub).

```bash
npm install @socket.io/redis-adapter redis
```

See Section 4.2 for the full `RedisIoAdapter` implementation.

### 9.2 BullMQ for Bulk Notifications

```bash
npm install @nestjs/bullmq bullmq
```

Register queue globally in `AppModule`:

```typescript
import { BullModule } from '@nestjs/bullmq';

BullModule.forRoot({
  connection: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  },
}),
```

Create the processor:

```typescript
// src/notifications/notifications.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  constructor(private readonly notificationsService: NotificationsService) {
    super();
  }

  async process(job: Job<{ dto: CreateNotificationDto; userIds: number[] }>): Promise<void> {
    const { dto, userIds } = job.data;
    for (const userId of userIds) {
      await this.notificationsService.create({ ...dto, userId });
    }
  }
}
```

Add `NotificationsProcessor` to `notifications.module.ts` providers.

### 9.3 Rate Limiting

The project already uses `@nestjs/throttler` globally. For the notification endpoints, you can apply tighter limits:

```typescript
@UseGuards(ThrottlerGuard)
@Throttle({ default: { ttl: 60000, limit: 10 } }) // 10 per minute
@Post('send')
sendToUser(@Body() dto: CreateNotificationDto) { ... }
```

### 9.4 Database Indexes

The `Notification` entity already defines composite indexes on `userId`, `type`, `isRead`, and `createdAt`. Add a partial index for unread count queries:

```sql
-- In migration:
CREATE INDEX idx_notifications_unread
  ON notifications (user_id, is_read)
  WHERE is_read = false AND deleted_at IS NULL;
```

### 9.5 Caching Unread Counts

The project already has `@nestjs/cache-manager`. Cache the `countUnread` result per user with a 30-second TTL:

```typescript
// In NotificationsClientController:
@CacheKey('unread-count')
@CacheTTL(30)
@Get('unread-count')
getUnreadCount(@CurrentUser('id') userId: number) { ... }
```

---

## 10. Security

### 10.1 WebSocket JWT Authentication

- Token is extracted from `Authorization: Bearer <token>` header or `?token=<token>` query param at connection time.
- Invalid/expired tokens → immediate `disconnect()`.
- Blacklisted tokens: extend `handleConnection` to call `AuthService.isTokenBlacklisted(token)` (already implemented in the project's `AuthGuard`).

```typescript
// In handleConnection — add after verifyAsync:
const isBlacklisted = await this.authService.isTokenBlacklisted(token);
if (isBlacklisted) {
  client.emit('error', { message: 'Token revoked' });
  client.disconnect();
  return;
}
```

### 10.2 Ownership Validation

Every REST operation that reads, updates, or deletes a notification calls `assertOwnership()`:

```typescript
private assertOwnership(n: Notification, userId: number): void {
  if (n.userId !== null && n.userId !== userId) {
    throw new ForbiddenException('Access denied');
  }
}
```

### 10.3 Admin-Only Endpoints

Use the existing `Roles` decorator on admin controllers:

```typescript
@Roles(UserRoleEnum.ADMIN)
@Controller('admin/notifications')
```

The existing `RolesGuard` in `src/auth/guards/roles.guard.ts` will enforce this.

### 10.4 Prevent Unauthorized Emits

- Clients can only **receive** notifications via Socket.IO.
- Clients can send `mark_read` WS events — but the gateway only acknowledges; DB mutations happen only via REST with full JWT + ownership checks.
- No client-to-server notification emission is exposed.

### 10.5 Input Validation

All DTOs use `class-validator`. The existing global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` strips and rejects unexpected fields automatically — no additional setup needed.

---

## 11. Step-by-Step Implementation Plan

### Phase 1 — Foundation (Day 1)

- [ ] **1.1** Install new dependencies:
  ```bash
  npm install @nestjs/event-emitter @nestjs/bullmq bullmq @socket.io/redis-adapter redis ioredis
  npm install -D @types/ioredis
  ```
- [ ] **1.2** Add `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT` to `.env` and `.env.example`.

---

### Phase 2 — Entities & Migration (Day 1–2)

- [ ] **2.1** Create `src/notifications/enums/notification-type.enum.ts`
- [ ] **2.2** Create `src/notifications/schema/notification.schema.ts`
- [ ] **2.3** Create `src/notifications/schema/notification-preferences.schema.ts`
- [ ] **2.4** Register entities in `NotificationsModule` via `TypeOrmModule.forFeature()`
- [ ] **2.5** Generate migration:
  ```bash
  npm run migration:generate -- db/migrations/AddNotificationsAndPreferences
  ```
- [ ] **2.6** Run migration:
  ```bash
  npm run migration:run
  ```
- [ ] **2.7** Manually verify tables in DB with `\d notifications` and `\d notification_preferences`.

---

### Phase 3 — Core Module Scaffolding (Day 2)

- [ ] **3.1** Create folder `src/notifications/` with all sub-directories (see Section 3)
- [ ] **3.2** Create `notification.events.ts` constants file
- [ ] **3.3** Create all DTOs (see Section 7)
- [ ] **3.4** Create `notification-payload.interface.ts`
- [ ] **3.5** Scaffold `notifications.module.ts`

---

### Phase 4 — Service Layer (Day 2–3)

- [ ] **4.1** Implement `NotificationsService` (see Section 5)
  - `create()`, `findAllForUser()`, `countUnread()`
  - `markAsRead()`, `markAllAsRead()`, `softDelete()`
  - `getPreferences()`, `updatePreferences()`
  - `adminSendToUser()`, `adminBroadcast()`
- [ ] **4.2** Add `@OnEvent` listeners for `ORDER_UPDATED`, `PAYMENT_SUCCESS`, `PAYMENT_FAILED`

---

### Phase 5 — WebSocket Gateway (Day 3)

- [ ] **5.1** Implement `NotificationsGateway` (see Section 4.1)
  - JWT auth on `handleConnection`
  - Room-based user tracking (`user:<userId>`)
  - `emitToUser()`, `broadcast()`, `emitToAdmins()`
  - `@SubscribeMessage('mark_read')` handler
- [ ] **5.2** Inject `JwtService` into gateway (already available via `JwtModule` in `AppModule`)
- [ ] **5.3** Wire gateway into `NotificationsModule`

---

### Phase 6 — REST Controllers (Day 3–4)

- [ ] **6.1** Implement `NotificationsClientController` (see Section 6.3)
- [ ] **6.2** Implement `NotificationsController` (admin) (see Section 6.4)
- [ ] **6.3** Wire controllers into `NotificationsModule`

---

### Phase 7 — Event Integration (Day 4)

- [ ] **7.1** Add `EventEmitterModule.forRoot()` to `AppModule`
- [ ] **7.2** Add `NotificationsModule` to `AppModule` imports
- [ ] **7.3** Inject `EventEmitter2` into `PaymentsService`:
  - Emit `NOTIFICATION_EVENTS.PAYMENT_SUCCESS` on successful Stripe webhook
  - Emit `NOTIFICATION_EVENTS.PAYMENT_FAILED` on failed payment
- [ ] **7.4** When `OrdersModule` is created (per `SERVICES_ORDERS.md`), inject `EventEmitter2` and emit `NOTIFICATION_EVENTS.ORDER_UPDATED` on status change

---

### Phase 8 — Scalability Setup (Day 4–5)

- [ ] **8.1** Install Redis adapter dependencies (already done in Phase 1)
- [ ] **8.2** Implement `RedisIoAdapter` class (see Section 4.2)
- [ ] **8.3** Register `BullModule.forRoot()` in `AppModule`
- [ ] **8.4** Implement `NotificationsProcessor` (see Section 9.2)
- [ ] **8.5** Add processor to `NotificationsModule` providers

---

### Phase 9 — Security Hardening (Day 5)

- [ ] **9.1** Add blacklist check to `handleConnection` in gateway
- [ ] **9.2** Apply `@Roles(UserRoleEnum.ADMIN)` to admin controller
- [ ] **9.3** Verify ownership checks in service methods
- [ ] **9.4** Apply `@Throttle()` on write endpoints in admin controller

---

### Phase 10 — Testing & QA (Day 5–6)

- [ ] **10.1** Write unit tests for `NotificationsService` using Jest mocks
- [ ] **10.2** Write e2e tests for REST endpoints:
  - Authenticated user can get, mark-read, delete their own notifications
  - Admin can send and broadcast
  - Un-authenticated requests return 401
  - User cannot access another user's notifications (403)
- [ ] **10.3** Manual WS test using a Socket.IO client (Postman / wscat)
  - Connect with valid JWT → receive notifications in real time
  - Connect without token → receive 'error' and get disconnected
- [ ] **10.4** Test event flow end-to-end:
  - Trigger a payment in Stripe test mode → verify notification appears in DB and is received via WS

---

## Dependency Summary

| Package | Purpose | Already Installed |
|---|---|---|
| `@nestjs/event-emitter` | Internal event bus (EventEmitter2) | ❌ |
| `@nestjs/bullmq` + `bullmq` | Job queue for bulk notifications | ❌ |
| `@socket.io/redis-adapter` | Redis-backed Socket.IO for horizontal scaling | ❌ |
| `redis` | Redis client for Socket.IO adapter | ❌ |
| `@nestjs/platform-socket.io` | Already provided by `@nestjs/platform-express` | ✅ (transitive) |
| `@nestjs/websockets` | WebSocket gateway decorators | ✅ (transitive) |
| `socket.io` | Socket.IO server | ✅ (transitive) |

---

## Environment Variables to Add

```env
# Redis (for Socket.IO adapter + BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379
```

---

*Plan authored on 2026-04-09 · Aligned with Sanad Backend (NestJS 11, TypeORM, PostgreSQL, Stripe)*
