# API Design Skill — NestJS
> A production-focused skill for designing clean REST APIs in NestJS with consistent naming conventions, stable response shapes, and a clear versioning strategy.

---

## SKILL.md (Entry Point)

---
name: api-design
description: >
  Expert API design guide for NestJS projects. Use this skill whenever the user asks
  to design, review, refactor, or scaffold REST endpoints, controllers, DTOs, request/
  response contracts, route naming, API versioning, pagination, filtering, or error
  handling. Also use it for questions about consistent response shapes, endpoint naming
  conventions, and long-term API evolution strategy. When in doubt, use this skill for
  any NestJS API design work.
---

# API Design Skill

You are an expert NestJS API architect. When designing REST APIs, always follow the
principles and patterns in this skill. Prefer simple, predictable, and versioned APIs
that are easy to consume, test, and evolve.

## Reference Files

| File | Load When |
|---|---|
| `references/naming.md` | Designing route names, controller names, DTO names, and resource identifiers |
| `references/responses.md` | Defining response envelopes, success/error shapes, pagination payloads |
| `references/versioning.md` | Choosing URI, header, or media-type versioning and deprecation strategy |
| `references/errors.md` | Creating error contracts, validation errors, and domain exceptions |
| `references/pagination.md` | Building list endpoints, filters, sorting, and paging metadata |
| `references/examples.md` | Full endpoint examples for common NestJS resources |

---

## Core Principles (Always Apply)

1. **Predictable over clever** — API consumers should be able to guess endpoint names and payloads.
2. **Resource-oriented REST** — Use nouns for resources, verbs only for actions that are not CRUD.
3. **Consistent shapes** — Every success response should follow one standard envelope.
4. **Version early** — Public APIs must have a versioning strategy from day one.
5. **Backward compatibility first** — Prefer additive changes; avoid breaking existing clients.
6. **Validation at the boundary** — Reject invalid input in DTOs before it reaches services.
7. **Explicit contracts** — Document every response field and every status code.
8. **No ambiguity** — Similar endpoints should follow the same naming and response patterns.

---

## Default API Standards

### Route Naming
- Use **plural nouns** for collections: `/users`, `/orders`, `/projects`
- Use **lowercase kebab-case** only when a resource name contains multiple words: `/payment-methods`
- Use `GET /resources` for lists and `GET /resources/:id` for single records
- Use nested routes only when the child resource depends on the parent:
  - `GET /users/:userId/orders`
  - `POST /projects/:projectId/members`
- Avoid deeply nested routes unless the parent is required for authorization or lookup
- Never encode action words in standard CRUD routes:
  - Bad: `/getUsers`, `/createUser`, `/delete-user`
  - Good: `/users`, `/users/:id`

### Controller Naming
- Use plural resource controllers: `UsersController`, `OrdersController`
- Use singular service names only when the domain is singular and explicit
- Keep controller method names aligned with intent:
  - `findAll`
  - `findOne`
  - `create`
  - `update`
  - `remove`

### Parameter Naming
- Use `:id` for direct resource lookup unless there is a strong reason to expose a domain key
- Use descriptive names for scoped routes:
  - `:userId`
  - `:projectId`
  - `:orderId`
- Do not mix `id`, `user_id`, and `userId` in the same API contract

---

## Standard REST Shape

### Success Response Envelope

```typescript
export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
  message?: string;
  timestamp: string;
  version: string;
}
```

### Error Response Envelope

```typescript
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
  path: string;
  version: string;
}
```

### Rules
- Every endpoint must return a predictable top-level shape
- Do not return raw objects from one endpoint and wrapped objects from another
- Always include a timestamp
- Always include the API version
- Use `meta` for pagination, filters, and non-core metadata
- Use `error.code` for machine-readable handling on the client
- Do not overload `message` with structured data

---

## Response Shape Patterns

### Single Resource

```typescript
return {
  success: true,
  data: userDto,
  message: 'User retrieved successfully',
  timestamp: new Date().toISOString(),
  version: 'v1',
};
```

### Collection Response

```typescript
return {
  success: true,
  data: users,
  meta: {
    page: 1,
    limit: 10,
    total: 42,
    totalPages: 5,
  },
  timestamp: new Date().toISOString(),
  version: 'v1',
};
```

### Empty Success Response

```typescript
return {
  success: true,
  data: null,
  message: 'Resource deleted successfully',
  timestamp: new Date().toISOString(),
  version: 'v1',
};
```

### Rules
- Use `null` for intentionally empty success payloads
- Use `204 No Content` only when the endpoint truly returns nothing
- For most APIs, prefer a consistent envelope even for deletions
- Avoid mixing `null`, `{}`, and `[]` for the same semantic case

---

## Versioning Strategy

## Recommended Default: URI Versioning

Use URI versioning for public APIs unless the project has a strong reason to choose another style.

```typescript
// main.ts
import { VersioningType } from '@nestjs/common';

app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1',
});
```

### Example Routes
- `/api/v1/users`
- `/api/v1/orders`
- `/api/v2/users`

### Rules
- Put the version in the path for clarity and cache friendliness
- Keep v1 stable and supported until clients are migrated
- Introduce v2 only when a breaking change is unavoidable
- Do not silently change payloads inside a stable version
- Every version must have its own contract and changelog

---

## Alternative Versioning Modes

### Header Versioning
Use header versioning only when the URL must stay identical across versions.

```typescript
app.enableVersioning({
  type: VersioningType.HEADER,
  header: 'x-api-version',
});
```

### Media Type Versioning
Use media-type versioning only for advanced ecosystem requirements.

```typescript
app.enableVersioning({
  type: VersioningType.MEDIA_TYPE,
  key: 'v=',
});
```

### Rules
- Prefer URI versioning by default in NestJS
- Only use header or media-type versioning if the platform requires it
- Do not mix versioning strategies within the same public API
- Document the chosen strategy in the root README and API docs

---

## NestJS Controller Pattern

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Version,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

@Controller({
  path: 'users',
  version: '1',
})
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }
}
```

### Controller Rules
- Controllers should only define HTTP behavior
- Never put business logic in controllers
- Keep route names resource-based and consistent
- Use `ParseUUIDPipe` when IDs are UUIDs
- Use the same route structure across similar resources
- Prefer `@HttpCode(HttpStatus.OK)` for delete endpoints when returning a standard envelope

---

## Action Endpoints

Use action endpoints only when CRUD semantics do not fit.

### Examples
- `POST /auth/login`
- `POST /orders/:id/cancel`
- `POST /projects/:id/publish`

### Rules
- Action endpoints should be exceptions, not the default
- Use verbs only for operations that change state in a domain-specific way
- Keep actions descriptive and stable
- Do not invent new action words if a standard REST route already works

---

## DTO Naming Conventions

### Request DTOs
- `CreateUserDto`
- `UpdateUserDto`
- `ListUsersQueryDto`
- `CreateOrderDto`

### Response DTOs
- `UserResponseDto`
- `OrderSummaryDto`
- `PaginatedUsersResponseDto`

### Rules
- Suffix DTOs by intent
- Separate request DTOs from response DTOs
- Do not reuse create DTOs as response contracts
- Keep query DTOs explicit for filters, paging, and sorting

---

## Pagination, Sorting, and Filtering

### Query DTO Pattern

```typescript
export class ListUsersQueryDto {
  page?: number = 1;
  limit?: number = 10;
  sortBy?: string = 'createdAt';
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
  search?: string;
}
```

### Paginated Response Pattern

```typescript
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  };
  timestamp: string;
  version: string;
}
```

### Rules
- Pagination metadata must always be in `meta`
- Use one paging structure across the entire API
- Keep search and filtering parameters in query strings
- Do not put pagination data inside the `data` array payload

---

## Error Design

### Standard Error Code Pattern
Use stable error codes that clients can rely on.

```typescript
export const ErrorCodes = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
} as const;
```

### Rules
- Error codes must be machine-readable and stable
- Do not use random strings or raw exception messages as codes
- Validation failures should include field-level details
- Authentication and authorization errors must be clearly separated
- Keep HTTP status codes and internal error codes aligned

---

## Naming Rules for Consistency

### Use
- `get` for retrieval in service methods
- `find` for query/search operations
- `create` for inserts
- `update` for partial modifications
- `replace` for full replacement when needed
- `remove` for deletions

### Avoid
- `fetchData`
- `doStuff`
- `processRequest`
- `handleAction` for normal CRUD flows

### Rules
- Use the same verbs across the whole codebase
- Choose one term for one concept
- Do not create synonyms for the same operation
- Prefer domain terms when they improve clarity

---

## API Design Checklist

### Before adding a new endpoint
- [ ] Is this a resource route or an action route?
- [ ] Is the route name plural and predictable?
- [ ] Does the request DTO validate everything at the boundary?
- [ ] Does the response shape match the global standard?
- [ ] Is the endpoint versioned correctly?
- [ ] Is the error contract documented?
- [ ] Is pagination or filtering needed?
- [ ] Does the route name match existing patterns in the API?

### Before releasing a new version
- [ ] Are all breaking changes isolated to the new version?
- [ ] Are deprecated endpoints still available?
- [ ] Have clients been notified of the change?
- [ ] Are response shapes and field names documented?
- [ ] Is the migration path clear and reversible?

---

## Recommended NestJS Response Wrapper

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { map, Observable } from 'rxjs';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
        version: 'v1',
      })),
    );
  }
}
```

### Rules
- Use a global interceptor when possible
- Keep the wrapper consistent for every successful response
- Allow explicit exceptions only for file downloads, streams, and webhooks
- Do not create different wrappers per module

---

## Dealing with Breaking Changes

### Breaking changes include
- Renaming fields
- Removing fields
- Changing field types
- Changing endpoint paths
- Changing response envelope structure
- Changing status code behavior

### Strategy
- Add new version rather than mutate old contracts
- Mark old endpoints deprecated
- Keep old and new versions documented in parallel
- Use feature flags only for internal rollout, not as a substitute for versioning

---

## NestJS App Bootstrap Pattern

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

### Rules
- Set the global prefix once
- Apply versioning at bootstrap
- Apply the response wrapper globally
- Keep the API entry point predictable and minimal

---

## Final Rule

If the API design is not obvious, make it simpler.

Prefer:
- stable names
- stable contracts
- stable versions
- stable response shapes

Never trade consistency for novelty.
