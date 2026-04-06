# Stripe Integration Skill — NestJS

> A production-focused skill for Stripe integrations in NestJS, covering webhook signature verification, idempotency keys, retry-safe flows, duplicate-event handling, and failure edge cases.

---

## SKILL.md (Entry Point)

```md
name: stripe-integration
description: >
  Expert Stripe integration guide for NestJS applications. Use this skill whenever the
  user asks to implement, review, refactor, or debug Stripe payments, subscriptions,
  invoices, refunds, checkout, webhooks, billing events, customer sync, or payment
  retries in a NestJS context. Also trigger for webhook signature verification, raw body
  handling, idempotency keys, duplicate-event protection, API version pinning, and edge
  case handling around Stripe request/response flows. When in doubt, use this skill for
  any Stripe-related backend work.
```

# Stripe Integration Skill

You are an expert Stripe integration engineer for NestJS. When writing or reviewing Stripe code, always follow the principles and patterns in this skill.

## Reference Files

| File | Load When |
|---|---|
| `references/webhooks.md` | Webhook signature verification, raw body handling, event dispatch |
| `references/idempotency.md` | POST retries, idempotency keys, duplicate request protection |
| `references/edge-cases.md` | Duplicate events, ordering, retries, failures, recovery flows |
| `references/versioning.md` | Stripe API version pinning, webhook API version alignment |

---

## Core Principles (Always Apply)

1. **Verify Every Webhook** — Never trust incoming Stripe webhook requests without validating the signature.
2. **Preserve the Raw Body** — Webhook signature verification requires the exact raw payload. Do not mutate it.
3. **Idempotency by Default** — Every Stripe POST that creates or mutates a resource must use an idempotency key.
4. **Treat Webhooks as At-Least-Once** — Duplicate deliveries are normal. Your handler must be safe to run more than once.
5. **Return 2xx Quickly** — A webhook should acknowledge Stripe fast, then process heavy work asynchronously.
6. **Use Durable State** — Store Stripe object IDs, event IDs, and processing status in your database.
7. **Pin API Versions** — Do not rely on silent version drift. Keep request and webhook versions intentional.
8. **Fail Closed** — When verification fails or critical data is missing, reject the request and log the reason.
9. **No Hidden Side Effects** — A retried request must not create duplicate rows, charges, or emails.
10. **Explicit Over Implicit** — Use clear names for event types, intent IDs, and payment states.

---

## Quick Checklists

### New Stripe Feature Checklist
- [ ] Define the Stripe flow: checkout, payment intent, subscription, refund, or webhook sync
- [ ] Identify the source of truth for the operation
- [ ] Add idempotency keys for every POST write path
- [ ] Add webhook verification using the raw body
- [ ] Persist Stripe IDs and local status fields
- [ ] Handle duplicate event delivery safely
- [ ] Add logging for failure and retry cases
- [ ] Add tests for signature failure, duplicate event, and replay scenarios

### Webhook Checklist
- [ ] Use the raw request body
- [ ] Read the `Stripe-Signature` header
- [ ] Verify with the endpoint secret
- [ ] Reject invalid signatures with 400
- [ ] Ignore unsupported event types safely
- [ ] Store `event.id` with a unique constraint
- [ ] Return 200 only after the event is accepted for processing

### Idempotency Checklist
- [ ] Generate a unique idempotency key per logical operation
- [ ] Reuse the same key only for safe retries of the same operation
- [ ] Never put secrets or personal data in the key
- [ ] Make the key stable across network retries
- [ ] Store the local request/operation ID that produced the Stripe call
- [ ] Handle replayed responses deterministically

---

# Webhook Design

## Webhook Contract

Stripe webhook handlers must be designed around these facts:

- Delivery is asynchronous.
- Delivery may be repeated.
- Event ordering is not guaranteed.
- A webhook may arrive before your database transaction finishes.
- Verification depends on the exact raw payload and the `Stripe-Signature` header.

Your webhook handler must therefore be:
- **verifiable**
- **idempotent**
- **fast**
- **replay-safe**

---

## Controller Pattern

```typescript
import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { StripeWebhookService } from './stripe-webhook.service';

@Controller('stripe')
export class StripeWebhookController {
  constructor(private readonly stripeWebhookService: StripeWebhookService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing Stripe-Signature header');
    }

    if (!req.rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    await this.stripeWebhookService.handleEvent(req.rawBody, signature);
    return { received: true };
  }
}
```

**Rules:**
- Never parse and re-stringify the webhook payload before verification
- Never trust `@Body()` for signature verification
- Never do long-running jobs directly inside the controller
- Keep the HTTP layer thin and deterministic

---

## Service Pattern

```typescript
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);
  private readonly stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: '2024-06-20',
    });
  }

  async handleEvent(rawBody: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET as string,
      );
    } catch (error) {
      this.logger.warn(`Stripe webhook verification failed: ${(error as Error).message}`);
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    await this.processEvent(event);
  }

  private async processEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event);
        break;

      case 'charge.refunded':
        await this.handleChargeRefunded(event);
        break;

      default:
        this.logger.debug(`Ignored unsupported Stripe event type: ${event.type}`);
        break;
    }
  }

  private async handlePaymentIntentSucceeded(event: Stripe.Event): Promise<void> {
    // process safely with dedupe guard
  }

  private async handlePaymentIntentFailed(event: Stripe.Event): Promise<void> {
    // process safely with dedupe guard
  }

  private async handleChargeRefunded(event: Stripe.Event): Promise<void> {
    // process safely with dedupe guard
  }
}
```

**Rules:**
- Verify before dispatch
- Use a single entry point for all events
- Keep handlers small and event-specific
- Never assume the event was delivered only once

---

## Raw Body Handling

Webhook verification requires the exact payload bytes.

### NestJS bootstrap

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```

### Express adapter note

If the request body is transformed by middleware, signature verification can fail. Keep webhook routes isolated from body parsers that mutate the payload.

**Rules:**
- Preserve the raw body for webhook routes
- Do not apply JSON normalization before verification
- Do not trim, pretty-print, or reserialize the payload

---

# Idempotency Strategy

## Core Rule

Use idempotency keys for all Stripe POST requests that create or mutate state.

Stripe will treat repeated requests with the same key as the same logical operation. That makes retries safe when a network error, timeout, or transient failure occurs.

---

## Key Generation Pattern

```typescript
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class StripeIdempotencyService {
  createKey(operation: string, entityId: string): string {
    return `${operation}:${entityId}:${randomUUID()}`;
  }
}
```

**Rules:**
- Use a unique key per logical operation
- Reuse the same key only for retries of the same action
- Keep the key stable inside a retry loop
- Never use email addresses, card numbers, or secrets in the key

---

## Example: Payment Intent Creation

```typescript
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  constructor(private readonly stripe: Stripe) {}

  async createPaymentIntent(input: {
    amount: number;
    currency: string;
    orderId: string;
    customerId: string;
  }) {
    const paymentIntent = await this.stripe.paymentIntents.create(
      {
        amount: input.amount,
        currency: input.currency,
        customer: input.customerId,
        metadata: {
          orderId: input.orderId,
        },
      },
      {
        idempotencyKey: `payment_intent:${input.orderId}`,
      },
    );

    return paymentIntent;
  }
}
```

**Rules:**
- One order should map to one logical creation request
- Use the same key when retrying the same order creation
- Do not generate a new key on each retry attempt
- Store the Stripe object ID after successful creation

---

## Safe Retry Behavior

When a Stripe POST fails because of a network problem, retry with the same idempotency key.

### Good
- same operation
- same parameters
- same key
- safe retry

### Bad
- same operation
- changed amount or customer
- same key
- accidental conflict or replay misuse

**Rules:**
- Treat parameter mismatches as integration bugs
- Retry only when the operation is logically identical
- Log the operation ID and idempotency key together

---

# Duplicate Event Protection

## Event Storage Pattern

Store every processed Stripe event ID in a table with a unique constraint.

```typescript
@Entity('stripe_events')
@Index(['stripeEventId'], { unique: true })
export class StripeEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'stripe_event_id' })
  stripeEventId: string;

  @Column({ name: 'event_type' })
  eventType: string;

  @Column({ name: 'processed_at', nullable: true })
  processedAt: Date | null;

  @Column({ name: 'payload', type: 'jsonb' })
  payload: Record<string, unknown>;
}
```

**Rules:**
- Persist event IDs before performing side effects
- Use a unique index to reject duplicates
- Never depend on in-memory dedupe only
- Make duplicate delivery a no-op

---

## Deduped Handler Pattern

```typescript
async handleEvent(rawBody: Buffer, signature: string): Promise<void> {
  const event = this.verifyEvent(rawBody, signature);

  const alreadyProcessed = await this.stripeEventRepo.findOne({
    where: { stripeEventId: event.id },
  });

  if (alreadyProcessed) {
    this.logger.debug(`Duplicate Stripe event ignored: ${event.id}`);
    return;
  }

  await this.stripeEventRepo.save(
    this.stripeEventRepo.create({
      stripeEventId: event.id,
      eventType: event.type,
      payload: event as unknown as Record<string, unknown>,
      processedAt: null,
    }),
  );

  await this.processEvent(event);

  await this.stripeEventRepo.update(
    { stripeEventId: event.id },
    { processedAt: new Date() },
  );
}
```

**Rules:**
- Save the event record before side effects
- Mark completion after processing succeeds
- If processing fails, leave the event in a recoverable state
- Make the retry path safe and observable

---

# Edge Case Handling

## 1) Duplicate Delivery

Stripe may resend a webhook.

**Required behavior:**
- recognize the event ID
- skip already-processed work
- return success quickly

---

## 2) Out-of-Order Events

A later event can arrive before an earlier one.

**Required behavior:**
- do not assume order
- derive state from the current canonical Stripe object if necessary
- store local state transitions defensively

Example:
- `payment_intent.succeeded` arrives before `payment_intent.processing`
- your system should still end in the correct final state

---

## 3) Missing Metadata

Sometimes Stripe objects arrive without the metadata you expected.

**Required behavior:**
- treat required metadata as a validation failure
- log the event ID and type
- route the event to a retry or review path if needed

```typescript
function requireMetadata(value: unknown, key: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new BadRequestException(`Missing required Stripe metadata: ${key}`);
  }
  return value;
}
```

---

## 4) Webhook Retry Storms

If Stripe cannot get a 2xx response, it retries.

**Required behavior:**
- make the handler fast
- avoid blocking on expensive downstream operations
- use async jobs for email, shipping, and long reconciliation tasks

**Rules:**
- Do not send emails inline
- Do not wait on slow third-party APIs inline
- Do not perform large database scans inline

---

## 5) Partial Failure After Side Effects

A handler may succeed halfway and then crash.

**Required behavior:**
- make each side effect idempotent
- record progress in the database
- continue safely on retry

Example:
- order status updated
- email failed
- webhook retried
- email should not be sent twice

---

## 6) Replay and Retry Headers

Stripe may indicate retry behavior through response headers on API calls.

**Required behavior:**
- respect retryable failures
- use exponential backoff
- do not hammer the API with rapid retries

**Rules:**
- Retry only when the failure is transient
- Prefer official client retry support where possible
- Log retry count and final failure reason

---

## 7) API Version Drift

Webhook payload shape and request behavior can change with API version selection.

**Required behavior:**
- pin the API version intentionally
- keep the webhook endpoint version aligned with the integration version
- test upgrades before production rollout

```typescript
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-06-20',
});
```

**Rules:**
- Never upgrade versions silently
- Keep webhook and API behavior predictable
- Test payload shape changes in staging first

---

# Error Handling

## Stripe Error Mapping

```typescript
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeErrorMapper {
  map(error: unknown): Error {
    if (error instanceof Stripe.errors.StripeCardError) {
      return new BadRequestException(error.message);
    }

    if (error instanceof Stripe.errors.StripeInvalidRequestError) {
      return new BadRequestException(error.message);
    }

    if (error instanceof Stripe.errors.StripeRateLimitError) {
      return new ConflictException('Stripe rate limit exceeded. Retry later.');
    }

    if (error instanceof Stripe.errors.StripeAPIError) {
      return new ConflictException('Stripe service temporarily unavailable.');
    }

    return new Error('Unexpected Stripe error');
  }
}
```

**Rules:**
- Differentiate validation errors from transient failures
- Do not expose secrets in error messages
- Log the Stripe request ID when available
- Use retries only for retryable failures

---

# Processing Flow Pattern

## Recommended Flow

1. Receive webhook
2. Verify signature
3. Check dedupe store
4. Persist event record
5. Enqueue job or process quickly
6. Update domain state
7. Mark event processed
8. Return 200

**Rules:**
- Every step must be safe to repeat
- Every step must be observable
- Every step must have clear failure handling

---

## Background Job Pattern

```typescript
async processEvent(event: Stripe.Event): Promise<void> {
  await this.queue.add('stripe-event', {
    eventId: event.id,
    type: event.type,
    payload: event,
  });
}
```

Use background workers for:
- email notifications
- fulfillment
- subscription synchronization
- invoice reconciliation
- refund side effects

---

# Testing Checklist

## Webhook Tests
- [ ] Invalid signature returns 400
- [ ] Missing signature returns 400
- [ ] Valid signature is accepted
- [ ] Duplicate event is ignored
- [ ] Unsupported event type is ignored safely
- [ ] Missing metadata fails clearly
- [ ] Retry after partial failure does not duplicate side effects

## Idempotency Tests
- [ ] Same key + same payload returns same logical result
- [ ] Same operation retried safely after timeout
- [ ] Different payload with same key is rejected or logged as misuse
- [ ] No duplicate Stripe objects are created on retry

## Edge Case Tests
- [ ] Out-of-order events still converge to the correct final state
- [ ] Handler remains stable when Stripe is temporarily unavailable
- [ ] Side effects are not repeated on webhook replay
- [ ] Processing failures are observable and recoverable

---

# Naming Conventions

Use clear, Stripe-specific names.

## Good
- `stripeWebhookService`
- `stripeEventId`
- `paymentIntentId`
- `checkoutSessionId`
- `stripeCustomerId`
- `idempotencyKey`
- `handlePaymentIntentSucceeded`

## Bad
- `data1`
- `eventStuff`
- `payment`
- `payload`
- `processWebhook`
- `handler`

**Rules:**
- Name by domain intent, not implementation detail
- Prefix external IDs with the provider name
- Use event names that match Stripe event semantics

---

# Security Patterns

## Secrets Management

```typescript
constructor(private readonly configService: ConfigService) {
  this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY') as string, {
    apiVersion: '2024-06-20',
  });
}
```

**Rules:**
- Never hardcode keys
- Never log secret values
- Load secrets from configuration only
- Rotate webhook secrets when needed

---

## Webhook Endpoint Isolation

Keep Stripe webhook endpoints isolated from normal authenticated app routes.

**Rules:**
- Do not require user JWT auth on Stripe webhooks
- Use signature verification instead of session auth
- Apply rate limiting carefully so legitimate Stripe retries still pass

---

# Common Failure Modes

1. **Signature verification fails** because the raw body changed
2. **Duplicate charges** because POST requests had no idempotency key
3. **Duplicate business actions** because webhook events were not deduped
4. **Out-of-order state** because handlers assumed delivery order
5. **Silent data drift** because API versions were not pinned
6. **Slow webhook responses** because heavy jobs ran inline
7. **Random production bugs** because retries were not designed into the workflow

---

# Golden Rules

- Verify first.
- Deduplicate always.
- Retry safely.
- Return fast.
- Persist state.
- Pin versions.
- Fail closed.
- Keep handlers idempotent.
- Treat every webhook as a replay.
- Treat every POST as retryable.

---

## Stripe Integration Rule Summary

When writing Stripe code in NestJS:

- webhook signature verification is mandatory
- raw body handling is non-negotiable
- idempotency keys are required for POST operations
- duplicate event handling must be built in
- edge cases must be handled explicitly
- API version behavior must be intentional and stable
