# 🔔 Real-Time Notification System — Work Plan

> **Stack:** NestJS 11 · TypeORM · PostgreSQL · Socket.IO · Redis · BullMQ  
> **Scope:** Backend only — no frontend code included  
> **Principles:** Clean Architecture · SOLID · Event-Driven · Production-Ready
> **Note:** Cache logic removed — frontend handles caching

---

## Project Status

| Item           | Status                     |
| -------------- | -------------------------- |
| NestJS Version | ✅ NestJS (latest)         |
| Database       | ✅ PostgreSQL + TypeORM    |
| Auth           | ✅ JWT + Blacklist Guards  |
| Redis          | ❌ Not installed           |
| Event Emitter  | ❌ Not installed           |
| BullMQ         | ❌ Not installed           |
| Socket.IO      | ✅ Transitive (via NestJS) |

---

## Phase 1 — Dependencies & Configuration (Day 1)

### 1.1 Install Dependencies

```bash
npm install @nestjs/event-emitter @nestjs/bullmq bullmq @socket.io/redis-adapter redis ioredis
npm install -D @types/ioredis
```

### 1.2 Create Config Files (Mandatory Pattern)

- `src/config/event-emitter.config.ts` — EventEmitter2 global config
- `src/config/bullmq.config.ts` — BullMQ connection settings
- `src/config/ws.config.ts` — Socket.IO Redis adapter config

### 1.3 Update Environment Variables

Add to `.env.example` and `.env`:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379
```

---

## Phase 2 — Database Entities (Day 1-2)

### 2.1 Create Enums

- `src/notifications/enums/notification-type.enum.ts`

### 2.2 Create Schema Files

- `src/notifications/schema/notification.schema.ts` — Main notification entity
- `src/notifications/schema/notification-preferences.schema.ts` — User preferences entity

### 2.3 Generate & Run Migration

```bash
npm run migration:generate -- db/migrations/AddNotificationsAndPreferences
npm run migration:run
```

---

## Phase 3 — Module Scaffolding (Day 2)

### 3.1 Create Folder Structure

```
src/notifications/
├── notifications.module.ts
├── notifications.controller.ts         # Admin
├── notifications.client.controller.ts  # User
├── notifications.service.ts
├── notifications.gateway.ts
├── notifications.gateway.adapter.ts    # Redis adapter
├── dto/
│   ├── create-notification.dto.ts
│   ├── broadcast-notification.dto.ts
│   ├── update-preferences.dto.ts
│   └── paginate-notifications.dto.ts
├── enums/
│   └── notification-type.enum.ts
├── events/
│   └── notification.events.ts
├── schema/
│   ├── notification.schema.ts
│   └── notification-preferences.schema.ts
└── interfaces/
    └── notification-payload.interface.ts
```

### 3.2 Create Supporting Files

- `notification.events.ts` — Event constants
- All DTOs with class-validator decorators
- `notification-payload.interface.ts`

---

## Phase 4 — Service Layer Implementation (Day 2-3)

### 4.1 Implement NotificationsService

Methods to implement:

- `create(dto)` — Save to DB + emit via WebSocket
- `findAllForUser(userId, pagination)` — Paginated list
- `countUnread(userId)` — Unread count
- `markAsRead(id, userId)` — Single mark read
- `markAllAsRead(userId)` — Bulk mark read
- `softDelete(id, userId)` — Soft delete
- `getPreferences(userId)` — Get user preferences
- `updatePreferences(userId, updates)` — Update preferences
- `adminSendToUser(dto)` — Admin send to specific user
- `adminBroadcast(dto)` — Admin broadcast

### 4.2 Add Event Listeners

- `@OnEvent(NOTIFICATION_EVENTS.ORDER_UPDATED)`
- `@OnEvent(NOTIFICATION_EVENTS.PAYMENT_SUCCESS)`
- `@OnEvent(NOTIFICATION_EVENTS.PAYMENT_FAILED)`

### 4.3 Create NotificationsProcessor

- `src/notifications/notifications.processor.ts` — BullMQ worker for bulk notifications

---

## Phase 5 — WebSocket Gateway (Day 3)

### 5.1 Implement NotificationsGateway

- JWT authentication on `handleConnection`
- Room-based user tracking (`user:<userId>`)
- `emitToUser(userId, payload)` — Send to specific user
- `broadcast(payload)` — Broadcast to all
- `@SubscribeMessage('mark_read')` — Client acknowledgment

### 5.2 Implement RedisIoAdapter

- Create `src/notifications/notifications.gateway.adapter.ts`
- Configure Redis adapter for horizontal scaling

---

## Phase 6 — REST Controllers (Day 3-4)

### 6.1 NotificationsClientController (User Endpoints)

| Method | Path                          | Description                 |
| ------ | ----------------------------- | --------------------------- |
| GET    | `/notifications`              | Get paginated notifications |
| GET    | `/notifications/unread-count` | Get unread count            |
| PATCH  | `/notifications/:id/read`     | Mark as read                |
| PATCH  | `/notifications/read-all`     | Mark all as read            |
| DELETE | `/notifications/:id`          | Soft delete                 |
| GET    | `/notifications/preferences`  | Get preferences             |
| PATCH  | `/notifications/preferences`  | Update preferences          |

### 6.2 NotificationsController (Admin Endpoints)

| Method | Path                             | Description           |
| ------ | -------------------------------- | --------------------- |
| POST   | `/admin/notifications/send`      | Send to specific user |
| POST   | `/admin/notifications/broadcast` | Broadcast to all      |
| GET    | `/admin/notifications`           | List all (paginated)  |
| DELETE | `/admin/notifications/:id`       | Hard delete           |

---

## Phase 7 — Integration with AppModule (Day 4)

### 7.1 Update app.module.ts

- Import `EventEmitterModule.forRoot()` (from config file)
- Import `BullModule.forRoot()` (from config file)
- Import `NotificationsModule`

### 7.2 Update main.ts

- Register RedisIoAdapter for Socket.IO

---

## Phase 8 — Event Integration (Day 4)

### 8.1 OrdersModule Integration

- Inject `EventEmitter2` into OrdersService (when Orders module exists)
- Emit `NOTIFICATION_EVENTS.ORDER_UPDATED` on status change

### 8.2 PaymentsModule Integration

- Inject `EventEmitter2` into PaymentsService
- Emit `NOTIFICATION_EVENTS.PAYMENT_SUCCESS` on successful payment
- Emit `NOTIFICATION_EVENTS.PAYMENT_FAILED` on failed payment

---

## Phase 9 — Security Hardening (Day 5)

- [ ] Add token blacklist check in `handleConnection`
- [ ] Apply `@Roles(UserRoleEnum.ADMIN)` to admin controller
- [ ] Verify ownership checks in service methods
- [ ] Apply `@Throttle()` on write endpoints

---

## Phase 10 — Testing & QA (Day 5-6)

- [ ] Unit tests for NotificationsService
- [ ] E2E tests for REST endpoints
- [ ] Manual WebSocket test with Socket.IO client
- [ ] End-to-end event flow test

---

## Implementation Order (Sequential)

1. **Install dependencies** — Phase 1
2. **Create config files** — Phase 1 (redis, event-emitter, bullmq)
3. **Create entities & run migration** — Phase 2
4. **Scaffold module & DTOs** — Phase 3
5. **Implement service layer** — Phase 4
6. **Implement WebSocket gateway** — Phase 5
7. **Implement REST controllers** — Phase 6
8. **Integrate with AppModule** — Phase 7
9. **Add event emitters** — Phase 8
10. **Security & testing** — Phase 9-10

---

## Technical Notes

- Following **SeniorBackend Agent** pattern: every library gets its own `*.config.ts` file
- All DTOs use `class-validator` with existing `ValidationPipe` (whitelist + forbidNonWhitelisted)
- Using `ioredis` (NOT `redis` npm package) for Socket.IO adapter per Socket.IO docs
- Using `BullModule` (NOT plain BullMQ) for NestJS integration

---

_Work Plan created on 2026-04-09 · Based on NOTIFICATIONS_PLAN.md_
