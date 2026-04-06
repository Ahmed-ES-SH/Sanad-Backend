# Feature Specification: Contact Module

**Feature Branch**: `006-contact-module`
**Created**: 2026-04-06
**Status**: Draft
**Input**: User description: "Contact Module - Public contact form submission with rate limiting, admin message management with read/unread filtering, reply tracking, and deletion"
**PRD Reference**: §5.4 Contact Us Module, §4 Database Schema (`contact_messages`), §6 API Endpoints

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visitor Submits a Contact Message (Priority: P1)

A website visitor wants to reach out to the portfolio owner by filling out a contact form. They provide their name, email, subject, and message. The system validates the input and enforces rate limiting to prevent spam.

**Why this priority**: Receiving messages is the core purpose of the contact module — without it the module has no value.

**Independent Test**: Can be tested by submitting a valid contact message and verifying it is stored, then exceeding the rate limit and verifying rejection.

**Acceptance Scenarios**:

1. **Given** a visitor on the contact page, **When** they submit a message with full_name "Jane Doe", email "jane@example.com", subject "Project Inquiry", and message body, **Then** the message is stored with `is_read = false`, `replied_at = null`, and a creation timestamp.
2. **Given** a visitor, **When** they submit a message with an invalid email format, **Then** the request is rejected with a validation error.
3. **Given** a visitor, **When** they submit a message without a required field (full_name, email, subject, or message), **Then** the request is rejected with a validation error indicating the missing field.
4. **Given** a visitor from the same IP who has submitted 5 messages in the last hour, **When** they attempt to submit another, **Then** the request is rejected with a rate-limit error (429).
5. **Given** a visitor, **When** they submit a valid message, **Then** no file attachments are accepted (the endpoint MUST NOT support multipart uploads).

---

### User Story 2 - Admin Reviews and Manages Messages (Priority: P1)

An administrator wants to view incoming contact messages, filter by read/unread status, mark messages as read, and delete messages they no longer need.

**Why this priority**: Without management capabilities, the contact inbox becomes unusable as messages accumulate.

**Independent Test**: Can be tested by listing messages with filters, marking a message as read, and deleting a message.

**Acceptance Scenarios**:

1. **Given** multiple contact messages exist, **When** the admin requests all messages, **Then** messages are returned paginated with newest first by default.
2. **Given** read and unread messages exist, **When** the admin filters by `is_read = false`, **Then** only unread messages are returned.
3. **Given** an unread message, **When** the admin marks it as read, **Then** `is_read = true`.
4. **Given** an existing message, **When** the admin views a single message by ID, **Then** all message details are returned (full_name, email, subject, message, is_read, replied_at, created_at).
5. **Given** an existing message, **When** the admin deletes it, **Then** the message is permanently removed.
6. **Given** a non-existent message ID, **When** the admin attempts any operation, **Then** a "not found" error is returned.

---

### User Story 3 - Admin Tracks Replies (Priority: P2)

An administrator wants to record when they have replied to a contact message. This is a tracking mechanism — the actual reply is sent externally (e.g., via email client). The admin marks the message as "replied" and the system records the timestamp.

**Why this priority**: Reply tracking improves workflow but is secondary to receiving and reviewing messages.

**Independent Test**: Can be tested by marking a message as replied and verifying the `replied_at` timestamp is set.

**Acceptance Scenarios**:

1. **Given** an existing message with `replied_at = null`, **When** the admin marks it as replied, **Then** `replied_at` is set to the current timestamp.
2. **Given** a message already marked as replied, **When** the admin marks it as replied again, **Then** `replied_at` is updated to the new timestamp.

---

### Edge Cases

- What happens when the rate limiter window resets? After 1 hour from the first message, the visitor's counter MUST reset.
- What happens when an admin deletes all messages? The listing MUST return an empty array, not an error.
- What happens when an admin marks a message as replied but not as read? Marking as replied SHOULD also set `is_read = true` automatically.
- What happens when two admins mark the same message simultaneously? The last write MUST win without errors.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept contact form submissions from unauthenticated visitors with full_name, email, subject, and message body.
- **FR-002**: System MUST validate that email is a valid format and all required fields are present.
- **FR-003**: System MUST enforce rate limiting on the public submission endpoint (5 requests per hour per IP address).
- **FR-004**: System MUST NOT accept file attachments on the contact submission endpoint.
- **FR-005**: System MUST store each message with `is_read = false` and `replied_at = null` by default.
- **FR-006**: System MUST allow authenticated admins to list all messages with pagination and filtering by read/unread status.
- **FR-007**: System MUST allow admins to view a single message by ID.
- **FR-008**: System MUST allow admins to mark a message as read.
- **FR-009**: System MUST allow admins to mark a message as replied (sets `replied_at` timestamp).
- **FR-010**: System MUST allow admins to delete a message permanently.
- **FR-011**: System MUST reject all admin operations from unauthenticated or unauthorized users.

### Key Entities

- **ContactMessage**: Represents a visitor's contact form submission. Key attributes: full name, email, subject, message body, read status, replied-at timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Visitors can submit a contact message in under 10 seconds including validation feedback.
- **SC-002**: Rate limiting correctly blocks the 6th submission within a 1-hour window from the same IP with 100% accuracy.
- **SC-003**: Admins can view and filter the message list in under 2 seconds.
- **SC-004**: Zero spam messages bypass the rate limiter under normal traffic conditions.

## Assumptions

- Authentication and authorization are already implemented.
- Rate limiting is IP-based; no captcha or challenge mechanism is required.
- The actual reply to visitors happens outside the system (e.g., via email client); this module only tracks that a reply occurred.
- Message deletion is permanent (hard delete), not soft delete.
