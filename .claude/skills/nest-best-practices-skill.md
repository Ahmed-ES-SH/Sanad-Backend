# NestJS Best Practices — Claude Skill
> A complete skill document covering architecture, validation, security, TypeORM, performance, and integrations (Stripe + Backblaze B2) for production NestJS projects.

---

## SKILL.md (Entry Point)

---
name: nestjs-best-practices
description: >
  Expert NestJS backend development guide covering architecture, security, performance,
  clean code, and production-ready patterns. Use this skill whenever the user asks to
  write, review, refactor, or scaffold ANY NestJS code — including modules, services,
  controllers, DTOs, entities, guards, interceptors, pipes, filters, or middleware.
  Also trigger for questions about TypeORM, Stripe integration, file upload patterns,
  API design, error handling, validation, configuration, or testing in a NestJS context.
  When in doubt, use this skill — it is the definitive reference for all NestJS backend work.
---

# NestJS Best Practices Skill

You are an expert NestJS backend engineer. When writing or reviewing NestJS code, always
follow the principles and patterns in this skill. Load only the reference sections relevant
to the current task.

## Reference Files

| File | Load When |
|---|---|
| `references/architecture.md` | Scaffolding modules, project structure, dependency injection |
| `references/validation-errors.md` | Writing DTOs, exception filters, error responses |
| `references/security.md` | Guards, rate limiting, CORS, helmet, sanitization |
| `references/typeorm.md` | Entities, repositories, migrations, query optimization |
| `references/performance.md` | Caching, async patterns, pagination, response shape |
| `references/integrations.md` | Stripe webhooks, Backblaze B2 uploads, external APIs |

---

## Core Principles (Always Apply)

1. **Single Responsibility** — Every class does one thing. Services handle business logic only. Controllers handle HTTP only.
2. **Dependency Injection** — Never instantiate services with `new`. Always inject via constructor.
3. **Fail Fast** — Validate at the boundary (DTO layer). Never let invalid data reach the service layer.
4. **Explicit over Implicit** — Name things clearly. Avoid magic strings; use enums and constants.
5. **No Raw SQL** — Use TypeORM QueryBuilder or repository methods. Parameterize everything.
6. **Async/Await** — Never mix `.then()` chains with `async/await`. Always `await` Promises.
7. **Env Safety** — No secrets or config values hardcoded. Always use `@nestjs/config`.

---

## Quick Checklists

### New Module Checklist
- [ ] Module file with imports/exports declared
- [ ] Controller with route decorators and `@ApiTags` for Swagger
- [ ] Service with injected repository
- [ ] Entity with TypeORM decorators
- [ ] `CreateDto` and `UpdateDto` (UpdateDto extends `PartialType(CreateDto)`)
- [ ] Custom exception for domain errors
- [ ] Module registered in `AppModule`

### Code Review Checklist
- [ ] No `any` types — use proper TypeScript types or generics
- [ ] No unhandled Promise rejections — all async methods wrapped or have global filter
- [ ] DTOs use `class-validator` decorators
- [ ] Sensitive fields excluded from responses (use `@Exclude()` or response DTOs)
- [ ] Pagination applied to all list endpoints
- [ ] Swagger decorators present on all endpoints
-e 

---

# Architecture & Module Structure

## Folder Layout (per module)

```
modules/
└── articles/
    ├── articles.module.ts
    ├── articles.controller.ts      ← HTTP layer only
    ├── articles.service.ts         ← Business logic only
    ├── entities/
    │   └── article.entity.ts
    ├── dto/
    │   ├── create-article.dto.ts
    │   ├── update-article.dto.ts
    │   └── article-response.dto.ts
    └── exceptions/
        └── article-not-found.exception.ts
```

---

## Module Definition Pattern

```typescript
// articles.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([Article])],
  controllers: [ArticlesController],
  providers: [ArticlesService],
  exports: [ArticlesService], // export only if other modules need it
})
export class ArticlesModule {}
```

**Rules:**
- Import `TypeOrmModule.forFeature([Entity])` in EVERY module that uses an entity
- Only export services that are genuinely shared
- Never import a module just to access its entity — use a shared repository pattern instead

---

## Controller Pattern

```typescript
@ApiTags('articles')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  @ApiOperation({ summary: 'List published articles' })
  @ApiOkResponse({ type: [ArticleResponseDto] })
  findAll(@Query() query: PaginationDto) {
    return this.articlesService.findAll(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get article by slug' })
  @ApiNotFoundResponse({ description: 'Article not found' })
  findOne(@Param('slug') slug: string) {
    return this.articlesService.findOneBySlug(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create article' })
  @ApiCreatedResponse({ type: ArticleResponseDto })
  create(@Body() dto: CreateArticleDto) {
    return this.articlesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateArticleDto) {
    return this.articlesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.articlesService.remove(id);
  }
}
```

**Rules:**
- Controllers have ZERO business logic — only call service methods and return results
- Always use `ParseUUIDPipe` for UUID params
- Use `@HttpCode(HttpStatus.NO_CONTENT)` for DELETE endpoints
- Apply `@UseGuards` at method level for granular control, or at controller level if ALL routes need it

---

## Service Pattern

```typescript
@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly articlesRepository: Repository<Article>,
  ) {}

  async findAll(query: PaginationDto): Promise<PaginatedResult<Article>> {
    const { page = 1, limit = 10 } = query;

    const [data, total] = await this.articlesRepository.findAndCount({
      where: { isPublished: true },
      order: { publishedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async findOneBySlug(slug: string): Promise<Article> {
    const article = await this.articlesRepository.findOne({ where: { slug } });
    if (!article) throw new ArticleNotFoundException(slug);
    return article;
  }

  async create(dto: CreateArticleDto): Promise<Article> {
    const slug = this.generateSlug(dto.title);
    await this.ensureSlugUnique(slug);

    const article = this.articlesRepository.create({ ...dto, slug });
    return this.articlesRepository.save(article);
  }

  async update(id: string, dto: UpdateArticleDto): Promise<Article> {
    const article = await this.findOneById(id);
    Object.assign(article, dto);
    return this.articlesRepository.save(article);
  }

  async remove(id: string): Promise<void> {
    const article = await this.findOneById(id);
    await this.articlesRepository.remove(article);
  }

  private async findOneById(id: string): Promise<Article> {
    const article = await this.articlesRepository.findOne({ where: { id } });
    if (!article) throw new ArticleNotFoundException(id);
    return article;
  }

  private generateSlug(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  private async ensureSlugUnique(slug: string): Promise<string> {
    const existing = await this.articlesRepository.findOne({ where: { slug } });
    return existing ? `${slug}-${Date.now()}` : slug;
  }
}
```

**Rules:**
- Services return domain objects or throw domain exceptions — never return HTTP responses
- Use `findOne()` + throw pattern consistently; never return `null` from public methods
- Extract private helpers for repeated logic (slug generation, uniqueness checks)
- Always use `repository.create()` before `repository.save()` to trigger entity hooks

---

## AppModule Setup

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        synchronize: false, // NEVER true in production
        ssl: { rejectUnauthorized: false }, // required for Neon
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 3600000, limit: 5 }]), // for contact form
    // Feature modules
    ServicesModule,
    ProjectsModule,
    ArticlesModule,
    ContactModule,
    PaymentsModule,
    UsersModule,
    MediaModule,
    DashboardModule,
  ],
})
export class AppModule {}
```

---

## main.ts Bootstrap

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: config.get('FRONTEND_URL'),
    credentials: true,
  });

  // Global pipes & filters
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,         // strip unknown fields
      forbidNonWhitelisted: true,
      transform: true,         // auto-transform types (string → number, etc.)
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger
  if (config.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Portfolio API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));
  }

  app.setGlobalPrefix('api/v1');
  await app.listen(config.get<number>('PORT', 3000));
}
bootstrap();
```
-e 

---

# Validation, DTOs & Error Handling

## DTO Patterns

### Create DTO

```typescript
// create-article.dto.ts
import { IsString, IsOptional, IsArray, MinLength, MaxLength, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateArticleDto {
  @ApiProperty({ example: 'Getting Started with NestJS' })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  title: string;

  @ApiProperty({ example: 'A short summary of the article...' })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  @Transform(({ value }) => value?.trim())
  excerpt: string;

  @ApiProperty({ example: '<p>Full article content...</p>' })
  @IsString()
  @MinLength(50)
  content: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/image.webp' })
  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;

  @ApiPropertyOptional({ example: ['NestJS', 'TypeScript'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
```

### Update DTO

```typescript
// update-article.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateArticleDto } from './create-article.dto';

// PartialType makes all fields optional AND preserves Swagger + validation decorators
export class UpdateArticleDto extends PartialType(CreateArticleDto) {}
```

### Response DTO (prevents leaking sensitive fields)

```typescript
// article-response.dto.ts
import { Exclude, Expose } from 'class-transformer';

@Exclude() // exclude everything by default
export class ArticleResponseDto {
  @Expose() id: string;
  @Expose() title: string;
  @Expose() slug: string;
  @Expose() excerpt: string;
  @Expose() content: string;
  @Expose() coverImageUrl: string;
  @Expose() tags: string[];
  @Expose() viewsCount: number;
  @Expose() readTimeMinutes: number;
  @Expose() publishedAt: Date;
  @Expose() createdAt: Date;
  // isPublished, internal flags — NOT exposed
}
```

### Pagination DTO

```typescript
// common/dto/pagination.dto.ts
import { IsOptional, IsPositive, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC' = 'DESC';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

---

## Custom Domain Exceptions

```typescript
// exceptions/article-not-found.exception.ts
import { NotFoundException } from '@nestjs/common';

export class ArticleNotFoundException extends NotFoundException {
  constructor(identifier: string) {
    super(`Article with identifier "${identifier}" was not found`);
  }
}

// Other common patterns:
export class ArticleAlreadyPublishedException extends ConflictException {
  constructor(id: string) {
    super(`Article "${id}" is already published`);
  }
}

export class SlugAlreadyExistsException extends ConflictException {
  constructor(slug: string) {
    super(`Slug "${slug}" is already taken`);
  }
}
```

**Rule:** Create one exception class per failure case. Never throw raw `new NotFoundException('...')` from services — use domain-specific exceptions for clarity.

---

## Global Exception Filter

```typescript
// common/filters/global-exception.filter.ts
import {
  ExceptionFilter, Catch, ArgumentsHost,
  HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();
      message = typeof exResponse === 'string' ? exResponse : exResponse;
    } else {
      // Log unexpected errors (DB issues, etc.)
      this.logger.error(`Unhandled exception: ${exception}`, (exception as Error)?.stack);
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

---

## Transform Interceptor (Consistent Response Shape)

```typescript
// common/interceptors/transform.interceptor.ts
import {
  Injectable, NestInterceptor, ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
```

This wraps every successful response in `{ success: true, data: ..., timestamp: ... }` automatically.
-e 

---

# Security Patterns

## Helmet (HTTP Headers)

```typescript
// main.ts
import helmet from 'helmet';
app.use(helmet()); // sets X-Content-Type-Options, X-Frame-Options, HSTS, etc.
```

---

## CORS

```typescript
app.enableCors({
  origin: (origin, callback) => {
    const allowed = [process.env.FRONTEND_URL];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});
```

---

## Rate Limiting

```typescript
// app.module.ts
ThrottlerModule.forRoot([
  {
    name: 'short',
    ttl: 1000,   // 1 second
    limit: 10,   // 10 req/sec global
  },
  {
    name: 'contact-form',
    ttl: 3600000, // 1 hour
    limit: 5,     // 5 contact submissions per hour per IP
  },
]),

// contact.controller.ts — apply strict throttle to contact endpoint only
@Post()
@Throttle({ 'contact-form': { limit: 5, ttl: 3600000 } })
submit(@Body() dto: CreateContactDto) {
  return this.contactService.create(dto);
}

// payments/webhook — skip throttle for Stripe webhooks
@Post('webhook')
@SkipThrottle()
handleWebhook(@Req() req: RawBodyRequest<Request>) { ... }
```

---

## Roles Guard

```typescript
// common/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user?.role === role);
  }
}

// common/decorators/roles.decorator.ts
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

// Usage in controller:
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Delete(':id')
remove(@Param('id', ParseUUIDPipe) id: string) { ... }
```

---

## Input Sanitization

```typescript
// ValidationPipe config in main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,              // strips properties NOT in DTO
    forbidNonWhitelisted: true,   // throws 400 if extra fields sent
    transform: true,
  }),
);
```

Never trust `@Body()` without `ValidationPipe`. The `whitelist: true` option is the primary defense against mass-assignment attacks.

---

## Stripe Webhook Signature Verification

```typescript
// payments.controller.ts
@Post('webhook')
@SkipThrottle()
async handleWebhook(
  @Headers('stripe-signature') signature: string,
  @Req() req: RawBodyRequest<Request>,
) {
  if (!signature) throw new BadRequestException('Missing stripe-signature header');
  return this.paymentsService.handleWebhook(req.rawBody, signature);
}

// payments.service.ts
async handleWebhook(rawBody: Buffer, signature: string) {
  let event: Stripe.Event;
  try {
    event = this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      this.configService.get('STRIPE_WEBHOOK_SECRET'),
    );
  } catch {
    throw new BadRequestException('Invalid Stripe webhook signature');
  }
  // process event...
}
```

**Critical:** The raw body must be preserved. In `main.ts`:
```typescript
const app = await NestFactory.create(AppModule, { rawBody: true });
```

---

## File Upload Security

```typescript
// media/media.interceptor.ts
export const imageUploadInterceptor = FileInterceptor('file', {
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB hard cap
  fileFilter: (_req, file, callback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
      return callback(new BadRequestException('Only image files are allowed'), false);
    }
    callback(null, true);
  },
  storage: memoryStorage(), // buffer in memory, not on disk
});
```

**Rules:**
- Never use `diskStorage` in production — always buffer → upload to B2 → discard
- Always validate `mimetype` — never trust the file extension alone
- UUID-rename every file before storage to prevent path traversal

---

## Secrets Management

```typescript
// config/app.config.ts
export default registerAs('app', () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  frontendUrl: process.env.FRONTEND_URL,
  nodeEnv: process.env.NODE_ENV || 'development',
}));

// Inject typed config in services:
constructor(
  @Inject(appConfig.KEY)
  private readonly config: ConfigType<typeof appConfig>,
) {}
```

Never use `process.env.SOMETHING` directly in services. Always inject `ConfigService` or typed config objects. This makes testing and configuration swapping straightforward.
-e 

---

# TypeORM Patterns

## Entity Definition

```typescript
// entities/article.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, BeforeInsert, BeforeUpdate,
} from 'typeorm';

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  title: string;

  @Column({ unique: true, length: 210 })
  slug: string;

  @Column('text')
  excerpt: string;

  @Column('text')
  content: string;

  @Column({ name: 'cover_image_url', nullable: true })
  coverImageUrl: string;

  @Column('text', { array: true, default: [] })
  tags: string[];

  @Column({ name: 'is_published', default: false })
  isPublished: boolean;

  @Column({ name: 'published_at', nullable: true })
  publishedAt: Date;

  @Column({ name: 'read_time_minutes', default: 0 })
  readTimeMinutes: number;

  @Column({ name: 'views_count', default: 0 })
  viewsCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Auto-calculate read time before insert or update
  @BeforeInsert()
  @BeforeUpdate()
  calculateReadTime() {
    const words = this.content?.split(/\s+/).length || 0;
    this.readTimeMinutes = Math.ceil(words / 200);
  }
}
```

**Rules:**
- Always use `snake_case` for column names via `{ name: 'column_name' }`
- Use `@PrimaryGeneratedColumn('uuid')` — never auto-increment integers
- Use `@CreateDateColumn` / `@UpdateDateColumn` — they handle timezone correctly
- Use `@BeforeInsert` / `@BeforeUpdate` hooks for computed fields

---

## Relations

```typescript
// One-to-Many / Many-to-One
@Entity('payments')
export class Payment {
  @ManyToOne(() => User, (user) => user.payments, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string; // always store the FK column separately for easy querying
}

@Entity('users')
export class User {
  @OneToMany(() => Payment, (payment) => payment.user)
  payments: Payment[];
}
```

**Rule:** Use `onDelete: 'RESTRICT'` for payments — never cascade-delete financial records.

---

## Repository Patterns

### findAndCount (Pagination)

```typescript
const [data, total] = await this.repo.findAndCount({
  where: { isPublished: true },
  order: { createdAt: 'DESC' },
  skip: (page - 1) * limit,
  take: limit,
  select: ['id', 'title', 'slug', 'excerpt', 'publishedAt'], // only fetch needed columns
});
```

### QueryBuilder (Complex Queries)

```typescript
const articles = await this.repo
  .createQueryBuilder('article')
  .where('article.isPublished = :published', { published: true })
  .andWhere(':tag = ANY(article.tags)', { tag: filterTag })
  .orderBy('article.publishedAt', 'DESC')
  .skip((page - 1) * limit)
  .take(limit)
  .getMany();
```

**Rule:** Use `findOne`/`find` for simple queries. Use `createQueryBuilder` for joins, conditions on arrays, or aggregations. Always use parameterized values — NEVER string interpolation.

### Increment (Atomic Counter)

```typescript
// Increment views_count atomically — no race condition
await this.repo.increment({ id }, 'viewsCount', 1);
```

Never do `article.viewsCount++` then `save()` — that's a race condition.

---

## Migrations (Production Workflow)

```bash
# Generate migration from entity changes
npx typeorm migration:generate src/database/migrations/AddPublishedAtToArticles -d src/data-source.ts

# Run migrations
npx typeorm migration:run -d src/data-source.ts

# Revert last migration
npx typeorm migration:revert -d src/data-source.ts
```

```typescript
// src/data-source.ts (for CLI)
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  ssl: { rejectUnauthorized: false }, // for Neon
});
```

**Rules:**
- `synchronize: false` ALWAYS in production and staging
- Never edit a migration file after it has been run
- Migration files are committed to Git — they are the source of truth for schema

---

## Indexes for Performance

```typescript
@Entity('articles')
@Index(['isPublished', 'publishedAt']) // composite index for common query pattern
@Index(['slug'], { unique: true })
export class Article {
  // ... columns
}
```

Add indexes for:
- Columns used in `WHERE` clauses
- Columns used in `ORDER BY`
- Foreign key columns
- Unique constraint columns (slug, email)

---

## Neon-Specific Config

```typescript
TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    url: config.get('DATABASE_URL'),
    ssl: { rejectUnauthorized: false }, // required for Neon serverless
    synchronize: false,
    logging: config.get('NODE_ENV') === 'development',
    extra: {
      max: 5, // Neon free tier has connection limits — keep pool small
    },
  }),
}),
```
-e 

---

# Performance Patterns

## Pagination (Standard Response Shape)

```typescript
// common/helpers/paginate.helper.ts
export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// Usage in service:
async findAll(query: PaginationDto): Promise<PaginatedResult<Article>> {
  const { page = 1, limit = 10 } = query;
  const [data, total] = await this.repo.findAndCount({
    skip: (page - 1) * limit,
    take: limit,
  });
  return paginate(data, total, page, limit);
}
```

---

## Select Only Needed Columns

```typescript
// BAD — fetches all columns including large 'content' field
const articles = await this.repo.find({ where: { isPublished: true } });

// GOOD — list view only needs summary fields
const articles = await this.repo.find({
  where: { isPublished: true },
  select: {
    id: true,
    title: true,
    slug: true,
    excerpt: true,
    coverImageUrl: true,
    publishedAt: true,
    readTimeMinutes: true,
    tags: true,
  },
});
```

Always select only what the client needs. Never return `content` (full body) in a list endpoint.

---

## Async Patterns

```typescript
// BAD — sequential awaits when tasks are independent
const projects = await projectsService.findAll();
const services = await servicesService.findAll();
const articles = await articlesService.findAll();

// GOOD — parallel execution
const [projects, services, articles] = await Promise.all([
  projectsService.findAll(),
  servicesService.findAll(),
  articlesService.findAll(),
]);
```

Use `Promise.all()` whenever operations don't depend on each other's results (e.g., Dashboard stats aggregation).

---

## Dashboard Stats (Single-Query Pattern)

```typescript
// dashboard.service.ts
async getStats(): Promise<DashboardStats> {
  const [
    [, totalProjects],
    [, publishedProjects],
    [, totalArticles],
    [, publishedArticles],
    [, totalServices],
    [, unreadMessages],
    [, totalUsers],
    payments,
  ] = await Promise.all([
    this.projectsRepo.findAndCount(),
    this.projectsRepo.findAndCount({ where: { isPublished: true } }),
    this.articlesRepo.findAndCount(),
    this.articlesRepo.findAndCount({ where: { isPublished: true } }),
    this.servicesRepo.findAndCount(),
    this.contactRepo.findAndCount({ where: { isRead: false } }),
    this.usersRepo.findAndCount(),
    this.paymentsRepo
      .createQueryBuilder('p')
      .select('COUNT(*)', 'total')
      .addSelect("SUM(CASE WHEN p.status = 'succeeded' THEN p.amount ELSE 0 END)", 'revenue')
      .getRawOne(),
  ]);

  return {
    projects: { total: totalProjects, published: publishedProjects },
    articles: { total: totalArticles, published: publishedArticles },
    services: { total: totalServices },
    unreadMessages,
    totalUsers,
    payments: {
      total: parseInt(payments.total),
      revenue: parseFloat(payments.revenue) || 0,
    },
  };
}
```

---

## Response Serialization (ClassSerializerInterceptor)

```typescript
// main.ts — apply globally
app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

// In controller, tell serializer which DTO to use:
@Get(':slug')
@SerializeOptions({ type: ArticleResponseDto })
findOne(@Param('slug') slug: string) {
  return this.articlesService.findOneBySlug(slug);
}
```

This automatically applies `@Exclude()` / `@Expose()` from response DTOs, removing sensitive fields before the response leaves the server.

---

## Slug Auto-Generation (Reusable Helper)

```typescript
// common/helpers/slug.helper.ts
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')   // remove special chars
    .replace(/[\s_-]+/g, '-')   // spaces/underscores to hyphens
    .replace(/^-+|-+$/g, '');   // trim leading/trailing hyphens
}

export async function generateUniqueSlug(
  base: string,
  checkExists: (slug: string) => Promise<boolean>,
): Promise<string> {
  let slug = generateSlug(base);
  let attempt = 0;
  while (await checkExists(slug)) {
    attempt++;
    slug = `${generateSlug(base)}-${attempt}`;
  }
  return slug;
}
```
-e 

---

# External Integrations

## Stripe Integration

### Setup

```typescript
// payments/stripe.service.ts
@Injectable()
export class StripeService {
  private readonly stripe: Stripe;

  constructor(private readonly config: ConfigService) {
    this.stripe = new Stripe(config.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2024-04-10',
    });
  }

  get client(): Stripe {
    return this.stripe;
  }
}
```

### Create Payment Intent

```typescript
// payments.service.ts
async createPaymentIntent(dto: CreatePaymentIntentDto, userId: string): Promise<{ clientSecret: string }> {
  const user = await this.usersService.findById(userId);

  // Ensure Stripe customer exists
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await this.stripeService.client.customers.create({
      email: user.email,
      name: user.fullName,
      metadata: { userId },
    });
    customerId = customer.id;
    await this.usersService.update(userId, { stripeCustomerId: customerId });
  }

  // Create intent (amount in cents)
  const intent = await this.stripeService.client.paymentIntents.create({
    amount: Math.round(dto.amount * 100),
    currency: dto.currency ?? 'usd',
    customer: customerId,
    description: dto.description,
    metadata: { userId },
  });

  // Save pending record
  await this.paymentsRepo.save(
    this.paymentsRepo.create({
      userId,
      stripePaymentIntentId: intent.id,
      stripeCustomerId: customerId,
      amount: dto.amount,
      currency: dto.currency ?? 'usd',
      description: dto.description,
      status: PaymentStatus.PENDING,
    }),
  );

  return { clientSecret: intent.client_secret };
}
```

### Webhook Handler

```typescript
async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
  let event: Stripe.Event;

  try {
    event = this.stripeService.client.webhooks.constructEvent(
      rawBody,
      signature,
      this.config.get('STRIPE_WEBHOOK_SECRET'),
    );
  } catch {
    throw new BadRequestException('Invalid Stripe signature');
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;
    case 'payment_intent.payment_failed':
      await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
      break;
    case 'charge.refunded':
      await this.handleRefund(event.data.object as Stripe.Charge);
      break;
    default:
      // ignore unhandled events — do NOT throw
      break;
  }
}

private async handlePaymentSucceeded(intent: Stripe.PaymentIntent): Promise<void> {
  await this.paymentsRepo.update(
    { stripePaymentIntentId: intent.id },
    { status: PaymentStatus.SUCCEEDED, metadata: intent.metadata },
  );
}

private async handlePaymentFailed(intent: Stripe.PaymentIntent): Promise<void> {
  await this.paymentsRepo.update(
    { stripePaymentIntentId: intent.id },
    { status: PaymentStatus.FAILED },
  );
}
```

### Refund

```typescript
async refundPayment(paymentId: string): Promise<Payment> {
  const payment = await this.findById(paymentId);

  if (payment.status !== PaymentStatus.SUCCEEDED) {
    throw new BadRequestException('Only succeeded payments can be refunded');
  }

  await this.stripeService.client.refunds.create({
    payment_intent: payment.stripePaymentIntentId,
  });

  // Status will be updated by webhook — don't update here to avoid race condition
  return payment;
}
```

---

## Backblaze B2 Upload

### Setup

```typescript
// media/b2.service.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class B2Service {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly endpoint: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get('B2_BUCKET_NAME');
    this.endpoint = config.get('B2_ENDPOINT');

    this.client = new S3Client({
      endpoint: this.endpoint,
      region: 'us-east-005', // match your B2 region
      credentials: {
        accessKeyId: config.get('B2_APPLICATION_KEY_ID'),
        secretAccessKey: config.get('B2_APPLICATION_KEY'),
      },
    });
  }
```

**Note:** Backblaze B2 is S3-compatible — use `@aws-sdk/client-s3` (no B2-specific SDK needed).

### Upload File

```typescript
  async upload(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ url: string; key: string }> {
    const ext = path.extname(file.originalname).toLowerCase();
    const key = `${folder}/${uuidv4()}${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      }),
    );

    const url = `${this.endpoint}/file/${this.bucket}/${key}`;
    return { url, key };
  }
```

### Delete File

```typescript
  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  extractKeyFromUrl(url: string): string {
    // Extract key from full B2 URL for deletion
    const prefix = `${this.endpoint}/file/${this.bucket}/`;
    return url.replace(prefix, '');
  }
}
```

### Media Controller

```typescript
// media/media.controller.ts
@ApiTags('media')
@Controller('admin/media')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class MediaController {
  constructor(private readonly b2Service: B2Service) {}

  @Post('upload')
  @UseInterceptors(imageUploadInterceptor)
  @ApiConsumes('multipart/form-data')
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder: string = 'general',
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.b2Service.upload(file, folder);
  }

  @Delete()
  async deleteFile(@Query('key') key: string) {
    if (!key) throw new BadRequestException('File key is required');
    await this.b2Service.delete(key);
    return { message: 'File deleted successfully' };
  }
}
```

---

## Enum Definitions

```typescript
// common/enums/role.enum.ts
export enum Role {
  ADMIN = 'admin',
  USER = 'user',
}

// common/enums/payment-status.enum.ts
export enum PaymentStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}
```

Always use TypeScript enums for finite sets of string values — never raw string literals.