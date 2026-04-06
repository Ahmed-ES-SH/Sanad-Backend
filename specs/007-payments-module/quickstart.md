# Quickstart: Payments Module

**Feature**: 007-payments-module
**Date**: 2026-04-06

## Prerequisites

- Node.js LTS installed
- PostgreSQL database accessible (Neon)
- `.env` file configured with `DATABASE_URL`
- Stripe account with API keys
- `.env` file configured with `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`
- Project dependencies installed (`npm install`)

## Setup Steps

### 1. Install Stripe SDK

```bash
npm install stripe@^17.7.0
```

### 2. Configure Environment Variables

Add to your `.env.development` file:

```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret
```

### 3. Generate Migration

After creating the `Payment` entity at `src/payments/schema/payment.schema.ts`, register it in `src/config/database.config.ts` and generate the migration:

```bash
npm run migration:generate --name=CreatePaymentsTable
```

### 4. Run Migration

```bash
npm run migration:run
```

### 5. Register Module

Add `PaymentsModule` to `AppModule` imports in `src/app.module.ts`:

```typescript
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    // ... existing imports
    PaymentsModule,
  ],
})
export class AppModule {}
```

### 6. Start Development Server

```bash
npm run start:dev
```

### 7. Verify Endpoints

**Client — create a payment intent:**
```bash
curl -X POST http://localhost:3000/payments/create-intent \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"amount": 50.00, "description": "Web Development Consultation"}'
```

**Admin — list all payments:**
```bash
curl http://localhost:3000/admin/payments \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Admin — filter by status:**
```bash
curl "http://localhost:3000/admin/payments?status=succeeded&page=1&limit=10" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Admin — view single payment:**
```bash
curl http://localhost:3000/admin/payments/<PAYMENT_ID> \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Admin — refund a payment:**
```bash
curl -X POST http://localhost:3000/admin/payments/<PAYMENT_ID>/refund \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Webhook — simulate Stripe event (use Stripe CLI):**
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
stripe trigger payment_intent.succeeded
```

### 8. Swagger Documentation

Visit `http://localhost:3000/api` to see all endpoints documented in Swagger UI.

## File Checklist

| File | Purpose |
|------|---------|
| `src/payments/payments.module.ts` | Module definition |
| `src/payments/payments.controller.ts` | Admin endpoints |
| `src/payments/payments.client.controller.ts` | Client endpoint (create intent) |
| `src/payments/payments.webhook.controller.ts` | Webhook handler |
| `src/payments/payments.service.ts` | Business logic + Stripe integration |
| `src/payments/schema/payment.schema.ts` | TypeORM entity |
| `src/payments/enums/payment-status.enum.ts` | Payment status enum |
| `src/payments/dto/create-payment-intent.dto.ts` | Create intent validation |
| `src/payments/dto/payment-filter.dto.ts` | Admin filter validation |
| `src/config/stripe.config.ts` | Stripe SDK factory provider |
| `src/config/database.config.ts` | Updated — Payment entity registered |
| `src/app.module.ts` | Updated — PaymentsModule imported |
| `db/migrations/*-CreatePaymentsTable.ts` | Database migration |
