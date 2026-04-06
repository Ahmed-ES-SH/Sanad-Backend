# API Contracts: Contact Module — Public Endpoints

**Feature**: 006-contact-module
**Base URL**: `/contact`
**Authentication**: None required (`@Public()` decorator)
**Rate Limit**: 5 requests per hour per IP address (overrides global throttler)

---

## POST /contact

Submit a contact form message.

### Request

**Body** (`application/json`):

```json
{
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "subject": "Project Inquiry",
  "message": "I would like to discuss a potential project collaboration..."
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `fullName` | string | Yes | Max 100 chars, not empty |
| `email` | string | Yes | Valid email format, max 255 chars |
| `subject` | string | Yes | Max 200 chars, not empty |
| `message` | string | Yes | Not empty |

**Note**: This endpoint MUST NOT accept `multipart/form-data`. Only `application/json` is supported (FR-004).

### Response

**201 Created**:

```json
{
  "message": "Your message has been sent successfully",
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

**400 Bad Request** (validation failure):

```json
{
  "statusCode": 400,
  "message": [
    "fullName should not be empty",
    "email must be an email",
    "subject should not be empty",
    "message should not be empty"
  ],
  "error": "Bad Request"
}
```

**429 Too Many Requests** (rate limit exceeded):

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

**Notes**:
- The visitor's IP address is stored for rate-limiting audit purposes.
- The message is stored with `is_read = false` and `replied_at = null` by default.
- Rate limit: 5 submissions per hour per IP. Counter resets 1 hour after the first request in the window.
