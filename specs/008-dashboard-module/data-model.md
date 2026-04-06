# Data Model: Dashboard Module

**Feature**: 008-dashboard-module
**Date**: 2026-04-06
**PRD Reference**: §5.6 Dashboard Module

## Entities

**No new entities.** This module is read-only and queries existing tables:

| Table | Owned By | Queries |
|-------|----------|---------|
| `services` | 001-services-module | `COUNT(*)`, `COUNT(*) WHERE is_published = true` |
| `projects` | 002-projects-module | `COUNT(*)`, `COUNT(*) WHERE is_published = true` |
| `articles` | 003-articles-module | `COUNT(*)`, `COUNT(*) WHERE is_published = true` |
| `contact_messages` | 004-contact-module | `COUNT(*) WHERE is_read = false` |
| `payments` | 007-payments-module | `COUNT(*)`, `SUM(amount) WHERE status = 'succeeded'` |
| `users` | auth/user module | `COUNT(*)` |

## Response DTO

### DashboardStatsDto

**File**: `src/dashboard/dto/dashboard-stats.dto.ts`

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardStatsDto {
  @ApiProperty({ description: 'Total number of projects', example: 10 })
  totalProjects: number;

  @ApiProperty({ description: 'Number of published projects', example: 7 })
  publishedProjects: number;

  @ApiProperty({ description: 'Total number of articles', example: 20 })
  totalArticles: number;

  @ApiProperty({ description: 'Number of published articles', example: 15 })
  publishedArticles: number;

  @ApiProperty({ description: 'Total number of services', example: 5 })
  totalServices: number;

  @ApiProperty({ description: 'Number of published services', example: 3 })
  publishedServices: number;

  @ApiProperty({ description: 'Number of unread contact messages', example: 4 })
  unreadMessages: number;

  @ApiProperty({ description: 'Total number of payments', example: 8 })
  totalPayments: number;

  @ApiProperty({
    description: 'Total revenue from succeeded payments in USD',
    example: 500.0,
  })
  totalRevenue: number;

  @ApiProperty({ description: 'Total number of registered users', example: 50 })
  totalUsers: number;

  @ApiPropertyOptional({
    description: 'Errors encountered while fetching stats for specific entities',
    example: ['projects: table not found'],
    type: [String],
  })
  errors?: string[];
}
```

## Service Aggregation Queries

Each stat is computed with a single efficient query executed in parallel:

### Projects

```typescript
// Total projects
const totalProjects = await this.projectRepo.count();

// Published projects
const publishedProjects = await this.projectRepo.count({
  where: { isPublished: true },
});
```

### Articles

```typescript
// Total articles
const totalArticles = await this.articleRepo.count();

// Published articles
const publishedArticles = await this.articleRepo.count({
  where: { isPublished: true },
});
```

### Services

```typescript
// Total services
const totalServices = await this.serviceRepo.count();

// Published services
const publishedServices = await this.serviceRepo.count({
  where: { isPublished: true },
});
```

### Contact Messages

```typescript
// Unread messages
const unreadMessages = await this.contactMessageRepo.count({
  where: { isRead: false },
});
```

### Payments & Revenue

```typescript
// Total payments
const totalPayments = await this.paymentRepo.count();

// Total revenue (sum of succeeded payments)
const revenueResult = await this.paymentRepo
  .createQueryBuilder('payment')
  .select('COALESCE(SUM(payment.amount), 0)', 'totalRevenue')
  .where('payment.status = :status', { status: 'succeeded' })
  .getRawOne();
const totalRevenue = parseFloat(revenueResult.totalRevenue);
```

### Users

```typescript
// Total users
const totalUsers = await this.userRepo.count();
```

## Migration

**No migration needed.** This module creates no new tables.
