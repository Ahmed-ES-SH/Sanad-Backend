# Product Requirements Document
## Portfolio Tech Company — NestJS Backend API

---

**Version:** 1.0.0
**Date:** April 2026
**Project Type:** RESTful API Backend
**Framework:** NestJS (Node.js)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Database Schema](#4-database-schema)
5. [Modules & Features](#5-modules--features)
   - 5.1 [Services Module](#51-services-module)
   - 5.2 [Portfolio Module](#52-portfolio-module)
   - 5.3 [Blog Module](#53-blog-module)
   - 5.4 [Contact Us Module](#54-contact-us-module)
   - 5.5 [Payments Module](#55-payments-module)
   - 5.6 [Dashboard Module](#56-dashboard-module)
   - 5.7 [Users Module](#57-users-module)
   - 5.8 [Media / Storage Module](#58-media--storage-module)
6. [API Endpoints Reference](#6-api-endpoints-reference)
7. [File Storage Strategy](#7-file-storage-strategy)
8. [Stripe Integration](#8-stripe-integration)
9. [Non-Functional Requirements](#9-non-functional-requirements)
10. [Environment Variables](#10-environment-variables)
11. [Project Folder Structure](#11-project-folder-structure)

---

## 1. Project Overview

A clean, production-ready NestJS backend that powers a personal tech portfolio website. The backend exposes a REST API consumed by the frontend and an admin dashboard. It handles content management (services, projects, blog articles), contact form submissions, user account management, and a Stripe-powered payment system.

**Goals:**
- Simple, maintainable codebase with no over-engineering
- Centralized admin dashboard control over all entities
- Reliable cloud storage via Backblaze B2
- Scalable PostgreSQL database hosted on Neon
- Secure payment flows via Stripe

**Out of Scope:**
- Authentication & Authorization logic (already implemented)
- Frontend rendering

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (LTS) |
| Framework | NestJS |
| Language | TypeScript |
| Database | PostgreSQL via **Neon** (serverless) |
| ORM | TypeORM |
| Cloud Storage | **Backblaze B2** |
| Payment Gateway | **Stripe** |
| File Uploads | Multer + Backblaze B2 SDK |
| Validation | class-validator / class-transformer |
| Documentation | Swagger (OpenAPI) |
| Config Management | @nestjs/config (.env) |

---

## 3. System Architecture

```
                         ┌──────────────────────┐
                         │   Frontend / Client   │
                         └────────┬─────────────┘
                                  │ HTTP REST
                         ┌────────▼─────────────┐
                         │   NestJS API Server   │
                         │  (Modules & Services) │
                         └──┬──────┬──────┬──────┘
                            │      │      │
              ┌─────────────▼─┐  ┌─▼────────────┐  ┌────────────────┐
              │  Neon Postgres │  │ Backblaze B2  │  │  Stripe API    │
              │  (Remote DB)   │  │ (File Storage)│  │  (Payments)    │
              └───────────────┘  └───────────────┘  └────────────────┘
```

All requests pass through globally applied:
- **Guards** — JWT Auth (existing)
- **Interceptors** — Response transformation, logging
- **Pipes** — Validation (class-validator)
- **Filters** — Global HTTP exception filter

---

## 4. Database Schema

### `services`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary Key |
| title | VARCHAR(150) | Required |
| slug | VARCHAR(160) | Unique, auto-generated |
| short_description | TEXT | Required |
| long_description | TEXT | Optional |
| icon_url | VARCHAR(255) | Backblaze URL |
| cover_image_url | VARCHAR(255) | Backblaze URL |
| is_published | BOOLEAN | Default: false |
| order | INT | Display order |
| created_at | TIMESTAMP | Auto |
| updated_at | TIMESTAMP | Auto |

---

### `projects`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary Key |
| title | VARCHAR(150) | Required |
| slug | VARCHAR(160) | Unique, auto-generated |
| short_description | TEXT | Required |
| long_description | TEXT | Optional |
| cover_image_url | VARCHAR(255) | Backblaze URL |
| images | TEXT[] | Array of Backblaze URLs |
| tech_stack | TEXT[] | e.g. ["React", "NestJS"] |
| live_url | VARCHAR(255) | Optional |
| repo_url | VARCHAR(255) | Optional |
| category | VARCHAR(100) | e.g. "Web App", "Mobile" |
| is_published | BOOLEAN | Default: false |
| is_featured | BOOLEAN | Default: false |
| order | INT | Display order |
| created_at | TIMESTAMP | Auto |
| updated_at | TIMESTAMP | Auto |

---

### `articles`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary Key |
| title | VARCHAR(200) | Required |
| slug | VARCHAR(210) | Unique, auto-generated |
| excerpt | TEXT | Short summary |
| content | TEXT | Full markdown/HTML body |
| cover_image_url | VARCHAR(255) | Backblaze URL |
| tags | TEXT[] | e.g. ["NestJS", "DevOps"] |
| is_published | BOOLEAN | Default: false |
| published_at | TIMESTAMP | Set when published |
| read_time_minutes | INT | Auto-calculated |
| views_count | INT | Default: 0 |
| created_at | TIMESTAMP | Auto |
| updated_at | TIMESTAMP | Auto |

---

### `contact_messages`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary Key |
| full_name | VARCHAR(100) | Required |
| email | VARCHAR(150) | Required |
| subject | VARCHAR(200) | Required |
| message | TEXT | Required |
| is_read | BOOLEAN | Default: false |
| replied_at | TIMESTAMP | Nullable |
| created_at | TIMESTAMP | Auto |

---

### `users`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary Key |
| email | VARCHAR(150) | Unique |
| full_name | VARCHAR(100) | Required |
| avatar_url | VARCHAR(255) | Backblaze URL |
| role | ENUM | `admin`, `user` |
| stripe_customer_id | VARCHAR(100) | Nullable |
| is_active | BOOLEAN | Default: true |
| created_at | TIMESTAMP | Auto |
| updated_at | TIMESTAMP | Auto |

---

### `payments`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary Key |
| user_id | UUID | FK → users |
| stripe_payment_intent_id | VARCHAR(200) | Unique |
| stripe_customer_id | VARCHAR(200) | Nullable |
| amount | DECIMAL(10,2) | In USD |
| currency | VARCHAR(10) | Default: "usd" |
| status | ENUM | `pending`, `succeeded`, `failed`, `refunded` |
| description | TEXT | What was paid for |
| metadata | JSONB | Extra Stripe data |
| created_at | TIMESTAMP | Auto |
| updated_at | TIMESTAMP | Auto |

---

## 5. Modules & Features

---

### 5.1 Services Module

**Purpose:** Manage the tech services offered on the portfolio site (e.g. "Web Development", "API Design").

**Features:**
- CRUD operations for services
- Toggle publish/unpublish
- Reorder services (drag-and-drop support via `order` field)
- Upload service icon and cover image to Backblaze B2
- Auto-generate slug from title
- Public endpoint returns only published services

**Business Rules:**
- Slug must be unique; if a duplicate is detected, append a suffix (e.g. `-2`)
- At least `title` and `short_description` are required to publish
- Deleting a service removes its associated images from Backblaze

---

### 5.2 Portfolio Module

**Purpose:** Manage portfolio projects displayed on the website.

**Features:**
- CRUD for projects
- Multiple image uploads per project (stored in Backblaze)
- Tech stack stored as a string array
- Featured flag to highlight top projects
- Filter by category and tech stack (public endpoint)
- Toggle publish/unpublish
- Reorder projects

**Business Rules:**
- A project must have a `cover_image_url` before it can be published
- Featured projects are limited to a configurable max (default: 6)
- Deleting a project purges all its images from Backblaze

---

### 5.3 Blog Module

**Purpose:** Manage articles/blog posts published on the website.

**Features:**
- CRUD for articles
- Rich content body (stored as HTML or Markdown string)
- Tag-based filtering on public endpoint
- Auto-calculate `read_time_minutes` based on word count (~200 wpm)
- Track `views_count` (increment on each public fetch by slug)
- Cover image upload to Backblaze
- Toggle publish/unpublish; set `published_at` on first publish

**Business Rules:**
- `excerpt` is required to publish
- Slug is auto-generated from title and must be unique
- Unpublishing does NOT reset `published_at`

---

### 5.4 Contact Us Module

**Purpose:** Receive and manage contact form submissions.

**Features:**
- Public endpoint to submit a contact message
- Dashboard endpoint to list all messages (with pagination, filter by read/unread)
- Mark message as read
- Record `replied_at` timestamp
- Delete messages

**Business Rules:**
- Basic spam protection: rate-limit the public submission endpoint (e.g. 5 requests per hour per IP)
- Email field must be a valid email format
- No attachments supported

---

### 5.5 Payments Module

**Purpose:** Accept payments via Stripe and record them in the database.

**Stripe Integration Flow:**

```
Client                    NestJS Backend                   Stripe
  │                             │                             │
  │── POST /payments/intent ───►│                             │
  │                             │── createPaymentIntent ─────►│
  │                             │◄── { client_secret } ───────│
  │◄── { client_secret } ───────│                             │
  │                             │                             │
  │── (User completes payment on frontend with Stripe.js) ──►│
  │                             │                             │
  │                             │◄── Webhook: payment_intent  │
  │                             │      .succeeded / .failed   │
  │                             │── Update payment record ───►│
  │                             │   (status, metadata)        │
```

**Features:**
- `POST /payments/intent` — Create a Stripe PaymentIntent, store a `pending` payment record
- Stripe Webhook endpoint — Listen to `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
- Update payment status in DB based on webhook events
- Dashboard: list all payments with filters (status, date range, user)
- Dashboard: view single payment detail
- Refund endpoint — trigger refund via Stripe API, update status to `refunded`

**Business Rules:**
- Webhook must verify Stripe signature using `STRIPE_WEBHOOK_SECRET`
- Payment records are never deleted — only status is updated
- Amount is stored in dollars (Stripe uses cents internally; conversion handled in service layer)

---

### 5.6 Dashboard Module

**Purpose:** Aggregate statistics and provide admin-only overview.

**Endpoints:**
- `GET /dashboard/stats` — Returns summary counts:
  - Total projects, published projects
  - Total articles, published articles
  - Total services, published services
  - Unread contact messages count
  - Total payments, total revenue (succeeded payments)
  - Total users

**Business Rules:**
- Dashboard endpoints are protected (admin role only)
- Stats are computed with a single aggregation query per entity, not cached (simple scope)

---

### 5.7 Users Module

**Purpose:** Manage user accounts from the admin dashboard.

**Features:**
- List all users (paginated)
- View single user profile
- Update user role (`admin` / `user`)
- Toggle user active/inactive (`is_active`)
- View a user's payment history
- Upload/update user avatar to Backblaze
- Delete user account (soft awareness: check for payment records before deletion)

**Business Rules:**
- Admins cannot deactivate their own account
- User email cannot be changed from dashboard (auth concern, out of scope)
- Deleting a user with payment records is blocked — return a clear error

---

### 5.8 Media / Storage Module

**Purpose:** Centralized file upload handling via Backblaze B2.

**Features:**
- Generic upload endpoint: `POST /media/upload` (admin only)
- Delete file by URL or file key
- Multer configuration: file size limit, allowed MIME types (images: jpeg, png, webp, gif; documents: pdf)
- File organized in B2 buckets by entity type: `/services/`, `/projects/`, `/articles/`, `/users/`
- Return public CDN URL after successful upload

**Business Rules:**
- Max file size: **5MB** per file
- Only image MIME types accepted for entity covers/avatars
- File names are UUID-based to avoid conflicts and hide original names
- Failed uploads should not leave orphan records in the DB

---

## 6. API Endpoints Reference

### Public Endpoints (no auth required)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/services` | List all published services |
| GET | `/services/:slug` | Get single service by slug |
| GET | `/projects` | List published projects (filter: category, tech, featured) |
| GET | `/projects/:slug` | Get single project by slug |
| GET | `/articles` | List published articles (filter: tags, paginated) |
| GET | `/articles/:slug` | Get article by slug (increments view count) |
| POST | `/contact` | Submit a contact message |
| POST | `/payments/intent` | Create a Stripe PaymentIntent |
| POST | `/payments/webhook` | Stripe webhook receiver |

---

### Admin / Protected Endpoints (auth required)

#### Services
| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/services` | List all services |
| POST | `/admin/services` | Create service |
| PATCH | `/admin/services/:id` | Update service |
| DELETE | `/admin/services/:id` | Delete service |
| PATCH | `/admin/services/:id/publish` | Toggle publish |
| PATCH | `/admin/services/reorder` | Update order of services |

#### Projects
| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/projects` | List all projects |
| POST | `/admin/projects` | Create project |
| PATCH | `/admin/projects/:id` | Update project |
| DELETE | `/admin/projects/:id` | Delete project |
| PATCH | `/admin/projects/:id/publish` | Toggle publish |
| PATCH | `/admin/projects/:id/feature` | Toggle featured |
| PATCH | `/admin/projects/reorder` | Update order |

#### Articles
| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/articles` | List all articles |
| POST | `/admin/articles` | Create article |
| PATCH | `/admin/articles/:id` | Update article |
| DELETE | `/admin/articles/:id` | Delete article |
| PATCH | `/admin/articles/:id/publish` | Toggle publish |

#### Contact Messages
| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/contact` | List all messages (paginated, filter: read/unread) |
| GET | `/admin/contact/:id` | Get single message |
| PATCH | `/admin/contact/:id/read` | Mark as read |
| PATCH | `/admin/contact/:id/replied` | Mark as replied |
| DELETE | `/admin/contact/:id` | Delete message |

#### Payments
| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/payments` | List all payments (filter: status, date) |
| GET | `/admin/payments/:id` | Get payment detail |
| POST | `/admin/payments/:id/refund` | Refund a payment |

#### Users
| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/users` | List all users (paginated) |
| GET | `/admin/users/:id` | Get user detail |
| PATCH | `/admin/users/:id/role` | Update user role |
| PATCH | `/admin/users/:id/status` | Toggle active/inactive |
| GET | `/admin/users/:id/payments` | List user's payments |
| DELETE | `/admin/users/:id` | Delete user |

#### Dashboard
| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/dashboard/stats` | Get aggregated stats |

#### Media
| Method | Endpoint | Description |
|---|---|---|
| POST | `/admin/media/upload` | Upload file to Backblaze |
| DELETE | `/admin/media` | Delete file from Backblaze |

---

## 7. File Storage Strategy

**Provider:** Backblaze B2

**Bucket Structure:**
```
portfolio-bucket/
├── services/
│   ├── icons/          ← service icon images
│   └── covers/         ← service cover images
├── projects/
│   ├── covers/         ← project main cover
│   └── gallery/        ← project additional images
├── articles/
│   └── covers/         ← article cover images
└── users/
    └── avatars/        ← user profile pictures
```

**Upload Flow:**
1. Client sends multipart/form-data to the NestJS backend
2. Multer buffers the file in memory (no local disk write)
3. Backend uploads the buffer to Backblaze B2 using the B2 SDK
4. Backblaze returns the file URL
5. URL is stored in the relevant DB column

**File Naming Convention:**
```
{entity}/{subfolder}/{uuid}.{ext}
Example: projects/gallery/f47ac10b-58cc-4372-a567-0e02b2c3d479.webp
```

---

## 8. Stripe Integration

**Package:** `stripe` (official Node.js SDK)

**Payment Flow:**
1. Frontend calls `POST /payments/intent` with `{ amount, currency, description, userId }`
2. Backend creates a `PaymentIntent` in Stripe
3. Backend saves a `pending` payment record in DB
4. Returns `client_secret` to the frontend
5. Frontend uses Stripe.js to complete the payment
6. Stripe sends a webhook event to `POST /payments/webhook`
7. Backend verifies webhook signature, updates payment status

**Webhook Events Handled:**

| Event | Action |
|---|---|
| `payment_intent.succeeded` | Update status → `succeeded` |
| `payment_intent.payment_failed` | Update status → `failed` |
| `charge.refunded` | Update status → `refunded` |

**Security:**
- Webhook endpoint skips JSON body parsing (uses raw buffer for signature verification)
- Stripe signature verified via `stripe.webhooks.constructEvent()`

---

## 9. Non-Functional Requirements

| Requirement | Detail |
|---|---|
| **Validation** | All DTOs validated via `class-validator` with descriptive error messages |
| **Error Handling** | Global exception filter returns consistent `{ statusCode, message, error }` shape |
| **Pagination** | All list endpoints support `?page=1&limit=10` query params |
| **Sorting** | List endpoints support `?sortBy=created_at&order=DESC` |
| **Swagger Docs** | All endpoints documented at `/api/docs` using `@nestjs/swagger` |
| **Rate Limiting** | Contact form: 5 req/hour/IP using `@nestjs/throttler` |
| **CORS** | Configured per environment (dev: open, prod: whitelist frontend domain) |
| **Logging** | NestJS Logger used consistently; Stripe webhooks logged |
| **Env Safety** | No secrets in code; all via `.env` + `@nestjs/config` |

---

## 10. Environment Variables

```env
# App
NODE_ENV=development
PORT=3000
FRONTEND_URL=https://your-portfolio.com

# Database — Neon PostgreSQL
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/portfolio?sslmode=require

# Backblaze B2
B2_APPLICATION_KEY_ID=your_key_id
B2_APPLICATION_KEY=your_application_key
B2_BUCKET_ID=your_bucket_id
B2_BUCKET_NAME=portfolio-bucket
B2_ENDPOINT=https://s3.us-west-004.backblazeb2.com

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_CURRENCY=usd
```

---

## 11. Project Folder Structure

```
src/
├── app.module.ts
├── main.ts
│
├── common/
│   ├── decorators/
│   ├── filters/              ← Global HTTP exception filter
│   ├── interceptors/         ← Response transform interceptor
│   ├── pipes/                ← Validation pipe
│   ├── guards/               ← (Auth guards — existing)
│   └── dto/
│       └── pagination.dto.ts
│
├── config/
│   ├── database.config.ts    ← Neon TypeORM config
│   ├── storage.config.ts     ← Backblaze B2 config
│   └── stripe.config.ts
│
├── modules/
│   ├── services/
│   │   ├── services.module.ts
│   │   ├── services.controller.ts
│   │   ├── services.service.ts
│   │   ├── entities/service.entity.ts
│   │   └── dto/
│   │
│   ├── projects/
│   │   ├── projects.module.ts
│   │   ├── projects.controller.ts
│   │   ├── projects.service.ts
│   │   ├── entities/project.entity.ts
│   │   └── dto/
│   │
│   ├── articles/
│   │   ├── articles.module.ts
│   │   ├── articles.controller.ts
│   │   ├── articles.service.ts
│   │   ├── entities/article.entity.ts
│   │   └── dto/
│   │
│   ├── contact/
│   │   ├── contact.module.ts
│   │   ├── contact.controller.ts
│   │   ├── contact.service.ts
│   │   ├── entities/contact-message.entity.ts
│   │   └── dto/
│   │
│   ├── payments/
│   │   ├── payments.module.ts
│   │   ├── payments.controller.ts
│   │   ├── payments.service.ts
│   │   ├── stripe.service.ts
│   │   ├── entities/payment.entity.ts
│   │   └── dto/
│   │
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── entities/user.entity.ts
│   │   └── dto/
│   │
│   ├── media/
│   │   ├── media.module.ts
│   │   ├── media.controller.ts
│   │   ├── media.service.ts        ← Backblaze B2 upload/delete logic
│   │   └── dto/
│   │
│   └── dashboard/
│       ├── dashboard.module.ts
│       ├── dashboard.controller.ts
│       └── dashboard.service.ts
│
└── database/
    └── migrations/               ← TypeORM migration files
```

---

*End of PRD — Portfolio Backend v1.0.0*