# API Contracts: Dashboard Module — Admin Endpoint

**Feature**: 008-dashboard-module
**Base URL**: `/admin/dashboard`
**Authentication**: Required — Bearer JWT, `admin` role

---

## GET /admin/dashboard

Retrieve aggregated statistics for the entire platform.

### Request

**Query Parameters**: None

### Response

**200 OK**:

```json
{
  "totalProjects": 10,
  "publishedProjects": 7,
  "totalArticles": 20,
  "publishedArticles": 15,
  "totalServices": 5,
  "publishedServices": 3,
  "unreadMessages": 4,
  "totalPayments": 8,
  "totalRevenue": 500.00,
  "totalUsers": 50
}
```

**200 OK** (with partial errors — some entities unavailable):

```json
{
  "totalProjects": 0,
  "publishedProjects": 0,
  "totalArticles": 20,
  "publishedArticles": 15,
  "totalServices": 5,
  "publishedServices": 3,
  "unreadMessages": 4,
  "totalPayments": 8,
  "totalRevenue": 500.00,
  "totalUsers": 50,
  "errors": [
    "projects: Failed to fetch statistics"
  ]
}
```

**200 OK** (empty platform — zero state):

```json
{
  "totalProjects": 0,
  "publishedProjects": 0,
  "totalArticles": 0,
  "publishedArticles": 0,
  "totalServices": 0,
  "publishedServices": 0,
  "unreadMessages": 0,
  "totalPayments": 0,
  "totalRevenue": 0,
  "totalUsers": 0
}
```

**401 Unauthorized**:

```json
{
  "statusCode": 401,
  "message": "Please provide a valid bearer token",
  "error": "Unauthorized"
}
```

**403 Forbidden** (non-admin user):

```json
{
  "statusCode": 403,
  "message": "You do not have sufficient permissions",
  "error": "Forbidden"
}
```

---

## Notes

- Revenue is calculated from `succeeded` payments only — `pending`, `failed`, and `refunded` payments are excluded.
- All counts reflect the current state of the database at request time (no caching).
- If an entity table is unavailable, its counts default to `0` and an error message is included in the `errors` array.
- The `errors` field is only present when at least one entity query failed.
