# Feature Specification: Payments Module

**Feature Branch**: `007-payments-module`
**Created**: 2026-04-06
**Status**: Draft
**Input**: User description: "Payments Module - Stripe PaymentIntent creation, webhook handling for payment status updates, admin payment listing with filters, and refund processing"
**PRD Reference**: §5.5 Payments Module, §8 Stripe Integration, §4 Database Schema (`payments`), §6 API Endpoints

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Client Initiates a Payment (Priority: P1)

A client wants to pay for a service. The frontend sends a payment request with amount, currency, and description. The system creates a payment intent with the payment gateway, stores a pending payment record, and returns a client secret so the frontend can complete the payment.

**Why this priority**: Payment initiation is the entry point of the entire payment flow — nothing else works without it.

**Independent Test**: Can be tested by sending a payment intent request and verifying a pending payment record is created and a client_secret is returned.

**Acceptance Scenarios**:

1. **Given** a payment request with amount $50.00, currency "usd", and description "Web Development Consultation", **When** the client submits it, **Then** a payment intent is created with the gateway, a `pending` payment record is stored in the database, and a `client_secret` is returned.
2. **Given** a payment request with a user ID, **When** submitted, **Then** the payment record is linked to that user.
3. **Given** a payment request with amount $0 or negative, **When** submitted, **Then** the request is rejected with a validation error.
4. **Given** a payment request without required fields (amount, description), **When** submitted, **Then** a validation error is returned.

---

### User Story 2 - System Processes Payment Status via Webhooks (Priority: P1)

The payment gateway sends webhook notifications when a payment succeeds, fails, or is refunded. The system verifies the webhook signature, finds the matching payment record, and updates its status accordingly.

**Why this priority**: Without webhook processing, payment records would remain permanently "pending" — the system would have no way to know if payments succeeded or failed.

**Independent Test**: Can be tested by sending simulated webhook events with valid signatures and verifying payment status updates in the database.

**Acceptance Scenarios**:

1. **Given** a pending payment record, **When** the system receives a `payment_intent.succeeded` webhook event with a valid signature, **Then** the payment status is updated to `succeeded` and metadata is stored.
2. **Given** a pending payment record, **When** the system receives a `payment_intent.payment_failed` webhook event with a valid signature, **Then** the payment status is updated to `failed`.
3. **Given** a succeeded payment record, **When** the system receives a `charge.refunded` webhook event with a valid signature, **Then** the payment status is updated to `refunded`.
4. **Given** a webhook event with an invalid signature, **When** the system receives it, **Then** the event is rejected and no payment record is modified.
5. **Given** a webhook event referencing a payment intent ID that does not exist in the database, **When** the system receives it, **Then** the event is logged but no error is raised to the gateway.
6. **endpoint** : `POST /api/stripe/webhook`

---

### User Story 3 - Admin Views and Filters Payments (Priority: P2)

An administrator wants to review all payment records in the dashboard. They can filter by status (pending, succeeded, failed, refunded), date range, and user. They can also view detailed information about a single payment.

**Why this priority**: Visibility into payments is essential for business operations but depends on payments existing first.

**Independent Test**: Can be tested by creating payment records with various statuses and dates, then querying with filters and verifying correct results.

**Acceptance Scenarios**:

1. **Given** payment records with different statuses, **When** the admin filters by status "succeeded", **Then** only succeeded payments are returned.
2. **Given** payment records across dates, **When** the admin filters by date range, **Then** only payments within that range are returned.
3. **Given** payment records for different users, **When** the admin filters by user ID, **Then** only that user's payments are returned.
4. **Given** a payment ID, **When** the admin requests its detail, **Then** all payment fields are returned including amount, currency, status, description, metadata, and timestamps.
5. **Given** a non-existent payment ID, **When** the admin requests it, **Then** a "not found" error is returned.

---

### User Story 4 - Admin Issues a Refund (Priority: P2)

An administrator wants to refund a payment that has already succeeded. The system triggers the refund with the payment gateway and updates the payment status.

**Why this priority**: Refunds are essential for customer satisfaction but are less frequent than payment creation and tracking.

**Independent Test**: Can be tested by issuing a refund for a succeeded payment and verifying the status changes to "refunded" and the gateway processes the refund.

**Acceptance Scenarios**:

1. **Given** a payment with status `succeeded`, **When** the admin triggers a refund, **Then** the refund is processed via the payment gateway and the payment status is updated to `refunded`.
2. **Given** a payment with status `pending`, **When** the admin attempts a refund, **Then** the request is rejected because only succeeded payments can be refunded.
3. **Given** a payment with status `refunded`, **When** the admin attempts another refund, **Then** the request is rejected because it is already refunded.
4. **Given** a payment with status `failed`, **When** the admin attempts a refund, **Then** the request is rejected.

---

### Edge Cases

- What happens when the payment gateway is temporarily unavailable during intent creation? The system MUST return a meaningful error without creating an orphan database record.
- What happens when the same webhook event is delivered multiple times (idempotency)? The system MUST handle duplicate events gracefully — the payment status should not be corrupted.
- What happens when a refund fails at the gateway level? The payment status MUST remain `succeeded` and an error MUST be returned to the admin.
- Payment records are never deleted — only status is updated.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create a payment intent with the payment gateway and return a client_secret to the caller.
- **FR-002**: System MUST store a `pending` payment record in the database upon creating a payment intent, with amount stored in dollars.
- **FR-003**: System MUST expose a webhook endpoint that receives payment status events from the gateway.
- **FR-004**: System MUST verify the webhook signature before processing any event.
- **FR-005**: System MUST update payment status to `succeeded`, `failed`, or `refunded` based on webhook events.
- **FR-006**: System MUST handle the following webhook events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`.
- **FR-007**: System MUST allow authenticated admins to list all payments with filters (status, date range, user) and pagination.
- **FR-008**: System MUST allow admins to view a single payment's full details.
- **FR-009**: System MUST allow admins to trigger a refund for a `succeeded` payment; the refund is processed via the gateway and status updated to `refunded`.
- **FR-010**: System MUST reject refund attempts on payments that are not in `succeeded` status.
- **FR-011**: System MUST NOT allow deletion of payment records — records are immutable except for status updates.
- **FR-012**: System MUST handle amount conversion between dollars (database) and cents (gateway) in the service layer.
- **FR-013**: The webhook endpoint MUST use raw body parsing (not JSON) for signature verification.

### Key Entities

- **Payment**: Represents a payment transaction. Key attributes: user reference, payment gateway intent ID (unique), customer ID, amount (decimal), currency, status (pending/succeeded/failed/refunded), description, metadata (flexible), timestamps.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Payment intent creation completes in under 5 seconds including gateway round-trip.
- **SC-002**: Webhook processing updates payment status within 2 seconds of event receipt.
- **SC-003**: 100% of webhook events with invalid signatures are rejected.
- **SC-004**: Refund processing completes in under 10 seconds including gateway round-trip.
- **SC-005**: Admins can filter and load the payments list in under 2 seconds.
- **SC-006**: Duplicate webhook events do not corrupt payment data.

## Assumptions

- Authentication and authorization are already implemented.
- The payment gateway is Stripe; integration details are implementation concerns.
- Amount conversion (dollars ↔ cents) is handled transparently by the service layer.
- The webhook endpoint is publicly accessible (no auth guard) but protected by signature verification.
- Payment records are never soft-deleted or hard-deleted.
