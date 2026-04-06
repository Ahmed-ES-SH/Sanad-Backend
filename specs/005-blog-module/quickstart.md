# Quickstart: Blog Module

**Feature**: 005-blog-module
**Date**: 2026-04-06

## Prerequisites

- Node.js LTS installed
- PostgreSQL database accessible (Neon)
- `.env` file configured with `DATABASE_URL`
- Project dependencies installed (`npm install`)
- Services module (001) completed — shared `PaginationQueryDto` and `slug.util.ts` available

## Setup Steps

### 1. Generate Migration

After creating the `Article` entity at `src/blog/schema/article.schema.ts`, register it in `src/config/database.config.ts` and generate the migration:

```bash
npm run migration:generate --name=CreateArticlesTable
```

### 2. Run Migration

```bash
npm run migration:run
```

### 3. Register Module

Add `BlogModule` to `AppModule` imports in `src/app.module.ts`:

```typescript
import { BlogModule } from './blog/blog.module';

@Module({
  imports: [
    // ... existing imports
    BlogModule,
  ],
})
export class AppModule {}
```

### 4. Start Development Server

```bash
npm run start:dev
```

### 5. Verify Endpoints

**Admin — create an article:**
```bash
curl -X POST http://localhost:3000/admin/blog \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title": "Getting Started with NestJS", "content": "NestJS is a progressive Node.js framework for building efficient and scalable server-side applications. It uses TypeScript by default and combines elements of OOP, FP, and FRP.", "excerpt": "A guide to NestJS", "tags": ["NestJS", "TypeScript"]}'
```

**Admin — list all articles:**
```bash
curl http://localhost:3000/admin/blog \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Admin — update an article:**
```bash
curl -X PATCH http://localhost:3000/admin/blog/<ARTICLE_ID> \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"tags": ["NestJS", "TypeScript", "Tutorial"]}'
```

**Admin — publish an article:**
```bash
curl -X PATCH http://localhost:3000/admin/blog/<ARTICLE_ID>/publish \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Admin — delete an article:**
```bash
curl -X DELETE http://localhost:3000/admin/blog/<ARTICLE_ID> \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Public — list published articles:**
```bash
curl http://localhost:3000/blog
```

**Public — filter by tag:**
```bash
curl "http://localhost:3000/blog?tag=NestJS"
```

**Public — get article by slug (increments view count):**
```bash
curl http://localhost:3000/blog/getting-started-with-nestjs
```

### 6. Swagger Documentation

Visit `http://localhost:3000/api` to see all endpoints documented in Swagger UI.

## File Checklist

| File | Purpose |
|------|---------|
| `src/blog/blog.module.ts` | Module definition |
| `src/blog/blog.controller.ts` | Admin endpoints |
| `src/blog/blog.public.controller.ts` | Public endpoints |
| `src/blog/blog.service.ts` | Business logic |
| `src/blog/schema/article.schema.ts` | TypeORM entity |
| `src/blog/dto/create-article.dto.ts` | Create validation |
| `src/blog/dto/update-article.dto.ts` | Update validation |
| `src/blog/dto/filter-articles-query.dto.ts` | Public filter params |
| `src/config/database.config.ts` | Updated — Article entity registered |
| `src/app.module.ts` | Updated — BlogModule imported |
| `db/migrations/*-CreateArticlesTable.ts` | Database migration |
