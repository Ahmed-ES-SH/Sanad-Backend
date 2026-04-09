## Role
your role is : .opencode/agent/SeniorBackend.md



## Goal
Design a complete backend architecture for a real-time notification system using NestJS and Socket.IO.

The system should support real-time and persistent notifications for both users and admins.

## Scope
Focus ONLY on backend logic (no frontend).

---

## Requirements

### 1. Notification Types
Support multiple types of notifications:
- System notifications
- Order updates
- Payment updates
- Admin messages
- Custom events

Each notification should include:
- id
- title
- message
- type
- userId (or broadcast)
- read status
- metadata (JSON)
- createdAt

---

### 2. Real-Time Layer (Socket.IO)
Design a WebSocket system using Socket.IO:
- Authenticate users via JWT on connection
- Map each user to a socket room (userId-based)
- Allow:
  - Emit notification to specific user
  - Broadcast notifications
  - Admin-triggered notifications
- Handle:
  - reconnect logic
  - multiple devices per user

---

### 3. Persistence Layer
Design database schema for notifications:
- Notifications table/entity
- Optional: NotificationPreferences

Support:
- Save every notification in DB
- Mark as read / unread
- Pagination for user notifications
- Soft delete (optional)

---

### 4. API Design (REST)
Provide endpoints for:
- Get user notifications (paginated)
- Mark notification as read
- Mark all as read
- Delete notification
- Admin: send notification to user(s)

---

### 5. Backend Architecture (NestJS)

Define:
- Modules (NotificationModule, Gateway, Service)
- WebSocket Gateway (Socket.IO)
- Services (business logic)
- DTOs
- Guards (JWT authentication)
- Interceptors (optional logging)

---

### 6. Event-Driven Design

Design an event-based system:
- Trigger notifications from other modules:
  - Orders module
  - Payments module
- Use:
  - EventEmitter or message-based approach

Example:
- Order status updated → emit notification
- Payment نجاح → emit notification

---

### 7. Data Flow

Explain full lifecycle:
1. Event occurs (e.g., order update)
2. Notification created in DB
3. Notification emitted via Socket.IO
4. User receives in real-time
5. User marks as read

---

### 8. Scalability & Performance

Address:
- Horizontal scaling (multiple instances)
- Redis adapter for Socket.IO
- Queue system (BullMQ or similar) for heavy notifications
- Rate limiting (prevent spam)

---

### 9. Security

- Secure WebSocket connection with JWT
- Validate user ownership for notifications
- Prevent unauthorized emits
- Protect admin-only endpoints

---

### 10. Output Format

Provide:

1. Architecture overview
2. Database schema (Entity design)
3. WebSocket Gateway implementation (NestJS)
4. Service layer logic
5. REST API endpoints list
6. Example code snippets (NestJS only)
7. Event-driven integration examples
8. Step-by-step implementation plan

---

## Constraints

- Follow clean architecture
- Use SOLID principles
- Avoid tight coupling
- Keep the system extensible
- Write production-ready code