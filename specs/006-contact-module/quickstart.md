# Quickstart: Contact Module

**Feature**: 006-contact-module
**Date**: 2026-04-06

## Prerequisites

- Node.js LTS installed
- PostgreSQL database accessible (Neon)
- `.env` file configured with `DATABASE_URL`
- Project dependencies installed (`npm install`)

## Setup Steps

### 1. Generate Migration

After creating the `ContactMessage` entity at `src/contact/schema/contact-message.schema.ts`, register it in `src/config/database.config.ts` and generate the migration:

```bash
npm run migration:generate --name=CreateContactMessagesTable
```

### 2. Run Migration

```bash
npm run migration:run
```

### 3. Register Module

Add `ContactModule` to `AppModule` imports in `src/app.module.ts`:

```typescript
import { ContactModule } from './contact/contact.module';

@Module({
  imports: [
    // ... existing imports
    ContactModule,
  ],
})
export class AppModule {}
```

### 4. Start Development Server

```bash
npm run start:dev
```

### 5. Verify Endpoints

**Public — submit a contact message:**
```bash
curl -X POST http://localhost:3000/contact \
  -H "Content-Type: application/json" \
  -d '{"fullName": "Jane Doe", "email": "jane@example.com", "subject": "Project Inquiry", "message": "Hello, I would like to discuss a project."}'
```

**Admin — list all messages:**
```bash
curl http://localhost:3000/admin/contact \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Admin — list unread messages only:**
```bash
curl "http://localhost:3000/admin/contact?isRead=false" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Admin — view a single message:**
```bash
curl http://localhost:3000/admin/contact/<MESSAGE_ID> \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Admin — mark message as read:**
```bash
curl -X PATCH http://localhost:3000/admin/contact/<MESSAGE_ID>/read \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Admin — mark message as replied:**
```bash
curl -X PATCH http://localhost:3000/admin/contact/<MESSAGE_ID>/reply \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Admin — delete a message:**
```bash
curl -X DELETE http://localhost:3000/admin/contact/<MESSAGE_ID> \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### 6. Verify Rate Limiting

Submit 6 contact messages in quick succession — the 6th should return `429 Too Many Requests`:

```bash
for i in {1..6}; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/contact \
    -H "Content-Type: application/json" \
    -d "{\"fullName\": \"Test $i\", \"email\": \"test$i@example.com\", \"subject\": \"Test $i\", \"message\": \"Message $i\"}"
done
```

Expected: First 5 return `201`, 6th returns `429`.

### 7. Swagger Documentation

Visit `http://localhost:3000/api` to see all endpoints documented in Swagger UI.

## File Checklist

| File | Purpose |
|------|---------|
| `src/contact/contact.module.ts` | Module definition |
| `src/contact/contact.controller.ts` | Admin endpoints |
| `src/contact/contact.public.controller.ts` | Public submission endpoint |
| `src/contact/contact.service.ts` | Business logic |
| `src/contact/schema/contact-message.schema.ts` | TypeORM entity |
| `src/contact/dto/create-contact-message.dto.ts` | Submission validation |
| `src/contact/dto/contact-query.dto.ts` | Admin list filter + pagination |
| `src/config/database.config.ts` | Updated — ContactMessage entity registered |
| `src/app.module.ts` | Updated — ContactModule imported |
| `db/migrations/*-CreateContactMessagesTable.ts` | Database migration |
