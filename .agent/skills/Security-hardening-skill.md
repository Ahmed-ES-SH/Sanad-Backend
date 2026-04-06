# Security Hardening — Claude Skill
> A production-grade security reference for NestJS backends covering HTTP hardening, auth/authorization, input validation, rate limiting, secrets management, logging, and infrastructure security.

---

## SKILL.md (Entry Point)

---
name: security-hardening
description: >
  Production-grade security hardening guide for NestJS backends. Use this skill whenever
  the user asks about security, authentication, authorization, JWT, guards, rate limiting,
  CORS, helmet, input validation, SQL injection, XSS, CSRF, file upload security, secrets
  management, environment hardening, dependency vulnerabilities, logging, audit trails,
  API abuse prevention, or any topic related to making a backend application secure.
  Also trigger for questions like "is this safe?", "how do I protect this endpoint?",
  "how do I prevent X attack?", or any request to review code for security issues.
  When in doubt, use this skill — security is non-negotiable and must always be applied.
---

# Security Hardening Skill

You are a security-focused NestJS backend engineer. When writing, reviewing, or advising
on any backend code, always apply the principles in this skill. Load the reference files
relevant to the current task — multiple files may apply.

## Reference Files

| File | Load When |
|---|---|
| `references/http-hardening.md` | HTTP headers, CORS, HTTPS, helmet, request limits |
| `references/auth-authorization.md` | JWT handling, guards, roles, token security |
| `references/input-validation.md` | DTO validation, sanitization, SQL injection, XSS, file uploads |
| `references/rate-limiting-abuse.md` | Throttling, IP blocking, abuse prevention, bot protection |
| `references/secrets-config.md` | Env vars, secrets management, config validation, key rotation |
| `references/logging-audit.md` | Security logging, audit trails, error exposure, monitoring |
| `references/dependency-infra.md` | Dependency scanning, production flags, Node.js hardening |

---

## Core Security Principles (Always Apply)

1. **Defense in Depth** — Never rely on a single layer. Stack guards, validation, and filters.
2. **Least Privilege** — Every role, token, and service account gets only what it strictly needs.
3. **Fail Secure** — When something goes wrong, default to denying access — not granting it.
4. **Validate at the Boundary** — Never trust any input. Validate and sanitize before it touches the DB or business logic.
5. **Zero Secrets in Code** — No API keys, passwords, or tokens ever in source files or Git history.
6. **Explicit over Implicit** — Never assume a route is protected. Explicitly apply guards and decorators.
7. **Audit Everything Sensitive** — Log auth events, permission failures, and payment actions — never raw passwords or tokens.

---

## Security Quick-Reference Checklist

### HTTP & Transport
- [ ] `helmet()` applied globally in `main.ts`
- [ ] CORS restricted to known origins (never `*` in production)
- [ ] HTTPS enforced (no HTTP in production)
- [ ] Request body size limited (`bodyParser` limit set)
- [ ] `X-Powered-By` header removed

### Authentication & Authorization
- [ ] JWT secrets are long (≥64 chars), random, and stored in env
- [ ] JWT expiry is short (access: 15m, refresh: 7d)
- [ ] All protected routes explicitly decorated with `@UseGuards()`
- [ ] Role checks applied beyond just "is authenticated"
- [ ] Refresh token rotation implemented
- [ ] No sensitive data (passwords, secrets) in JWT payload

### Input & Data
- [ ] `ValidationPipe` with `whitelist: true` + `forbidNonWhitelisted: true` globally
- [ ] All UUID params use `ParseUUIDPipe`
- [ ] File uploads: MIME type checked, size capped at 5MB, UUID-renamed
- [ ] TypeORM parameterized queries only — zero raw string interpolation
- [ ] `@Exclude()` on all sensitive entity fields

### Rate Limiting & Abuse
- [ ] Global rate limiter applied (`ThrottlerModule`)
- [ ] Stricter limits on auth endpoints (login, register, password reset)
- [ ] Contact/public form endpoints throttled by IP
- [ ] Stripe webhook endpoint skips throttle but verifies signature

### Secrets & Config
- [ ] All secrets in `.env`, never committed to Git
- [ ] `.env` in `.gitignore`; `.env.example` committed with dummy values
- [ ] Config validated at startup (app crashes on missing required env)
- [ ] Stripe webhook secret verified on every webhook event

### Logging & Monitoring
- [ ] No passwords, tokens, or PII in logs
- [ ] Auth failures logged with IP and timestamp
- [ ] Global exception filter catches and logs all 500 errors
- [ ] No stack traces exposed to clients in production
-e 

---

# HTTP Hardening

## Helmet (Security Headers)

```typescript
// main.ts
import helmet from 'helmet';

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://*.backblazeb2.com'],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // disable if you embed third-party content
    hsts: {
      maxAge: 31536000,     // 1 year
      includeSubDomains: true,
      preload: true,
    },
  }),
);
```

**Headers helmet sets automatically:**
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `X-Frame-Options: SAMEORIGIN` — prevents clickjacking
- `X-XSS-Protection: 0` — disables broken browser XSS filter
- `Referrer-Policy: no-referrer` — hides referrer on cross-origin
- `Permissions-Policy` — restricts browser feature access

**Always remove:**
```typescript
app.use((_req, res, next) => {
  res.removeHeader('X-Powered-By'); // hides "Express" from attackers
  next();
});
```

---

## CORS — Strict Configuration

```typescript
// main.ts
const allowedOrigins = [
  process.env.FRONTEND_URL,
  // add staging URL if needed
].filter(Boolean);

app.enableCors({
  origin: (origin, callback) => {
    // Allow server-to-server (no origin) and whitelisted origins only
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Total-Count'],   // safe headers the client can read
  credentials: true,
  maxAge: 86400,                        // preflight cache: 24h
});
```

**Never do:**
```typescript
app.enableCors(); // BAD — allows ALL origins
app.enableCors({ origin: '*' }); // BAD — open to any domain
```

---

## Request Body Size Limits

```typescript
// main.ts — protect against large payload attacks
import * as bodyParser from 'body-parser';

// Standard JSON routes
app.use('/api', bodyParser.json({ limit: '100kb' }));

// Raw body ONLY for Stripe webhook (must come before global JSON parser)
app.use(
  '/api/v1/payments/webhook',
  bodyParser.raw({ type: 'application/json' }),
);
```

**Or in NestJS bootstrap:**
```typescript
const app = await NestFactory.create(AppModule, {
  rawBody: true,           // enables req.rawBody for Stripe webhook
  bodyParser: true,
});

// Then restrict body size via express:
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
```

---

## HTTPS Enforcement

Never handle HTTPS termination in NestJS directly — do it at the infrastructure level (Nginx, Cloudflare, Railway, Render). But do enforce the redirect in app if needed:

```typescript
// middleware/https-redirect.middleware.ts
@Injectable()
export class HttpsRedirectMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const isProduction = process.env.NODE_ENV === 'production';
    const isHttps = req.headers['x-forwarded-proto'] === 'https';

    if (isProduction && !isHttps) {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  }
}

// app.module.ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpsRedirectMiddleware).forRoutes('*');
  }
}
```

---

## Global Prefix & Versioning

```typescript
// main.ts
app.setGlobalPrefix('api');
app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
// Routes become: /api/v1/articles, /api/v1/projects, etc.
```

Versioning lets you introduce breaking changes without breaking existing clients — critical when a dashboard and a public website consume the same API.
-e 

---

# Authentication & Authorization

## JWT Best Practices

### Token Configuration

```typescript
// auth/auth.module.ts
JwtModule.registerAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    secret: config.get('JWT_SECRET'),         // min 64 random chars
    signOptions: {
      expiresIn: '15m',                        // SHORT — access tokens expire fast
      issuer: 'portfolio-api',
      audience: 'portfolio-client',
    },
  }),
}),
```

**Access token:** 15 minutes. Short-lived so stolen tokens expire quickly.
**Refresh token:** 7 days, stored in DB, rotated on every use.

---

### JWT Payload — What to Include and Exclude

```typescript
// GOOD — minimal payload
const payload = {
  sub: user.id,       // subject: user UUID
  role: user.role,    // for role-based checks without extra DB query
  iat: Date.now(),    // issued-at (auto-added by library)
};

// NEVER include in payload:
// ❌ password hash
// ❌ raw email (PII)
// ❌ Stripe keys or any secret
// ❌ large objects (tokens are in every request header)
```

---

### JWT Guard (Reusable)

```typescript
// auth/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<T>(err: Error, user: T, info: Error): T {
    if (err || !user) {
      throw err || new UnauthorizedException(
        info?.message === 'jwt expired'
          ? 'Token has expired — please log in again'
          : 'Invalid or missing token',
      );
    }
    return user;
  }
}
```

Give meaningful error messages for expired vs. invalid tokens so the client can handle each case correctly (expired → refresh, invalid → logout).

---

### Roles Guard (Layered Authorization)

```typescript
// common/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator → route requires auth but no specific role
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();

    if (!user) throw new UnauthorizedException('User not found in request');

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied: requires role [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}

// common/decorators/roles.decorator.ts
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

**Always stack both guards — never use one without the other on protected routes:**
```typescript
@UseGuards(JwtAuthGuard, RolesGuard) // order matters: JWT first, then roles
@Roles(Role.ADMIN)
@Delete(':id')
remove(@Param('id', ParseUUIDPipe) id: string) { ... }
```

---

### Ownership Guard (Resource-Level Authorization)

Prevent users from accessing other users' resources:

```typescript
// common/guards/ownership.guard.ts
@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const { user, params } = request;

    // Admins bypass ownership checks
    if (user.role === Role.ADMIN) return true;

    // Check that the resource belongs to the requesting user
    if (params.userId && params.userId !== user.id) {
      throw new ForbiddenException('You do not have access to this resource');
    }

    return true;
  }
}
```

---

### Refresh Token Rotation Pattern

```typescript
// auth/auth.service.ts
async refreshTokens(userId: string, refreshToken: string) {
  const user = await this.usersService.findById(userId);

  // Verify stored token (hashed in DB)
  const isValid = await bcrypt.compare(refreshToken, user.hashedRefreshToken);
  if (!isValid) {
    // Token reuse detected — invalidate all sessions
    await this.usersService.clearRefreshToken(userId);
    throw new ForbiddenException('Refresh token reuse detected — please log in again');
  }

  // Rotate: generate new pair, hash and store new refresh token
  const tokens = await this.generateTokens(user);
  const hashed = await bcrypt.hash(tokens.refreshToken, 12);
  await this.usersService.updateRefreshToken(userId, hashed);

  return tokens;
}

async logout(userId: string) {
  // Always allow logout — even if token is already invalid
  await this.usersService.clearRefreshToken(userId);
}
```

**Key:** Store a **hash** of the refresh token in DB (never the raw token). On reuse detection (old token used after rotation), invalidate ALL sessions — this indicates theft.

---

### Password Hashing

```typescript
// Always use bcrypt with cost factor ≥ 12
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

async hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

**Never use:**
- MD5 / SHA-1 / SHA-256 for passwords (fast = bad for passwords)
- `bcrypt.genSalt()` separately — pass the rounds integer directly
- Cost factor < 12 in production

---

### Admin Self-Protection Rules

```typescript
// users.service.ts
async updateStatus(requestingUserId: string, targetId: string, isActive: boolean) {
  if (requestingUserId === targetId && !isActive) {
    throw new ForbiddenException('Administrators cannot deactivate their own account');
  }
  await this.usersRepo.update(targetId, { isActive });
}

async updateRole(requestingUserId: string, targetId: string, role: Role) {
  if (requestingUserId === targetId) {
    throw new ForbiddenException('Administrators cannot change their own role');
  }
  await this.usersRepo.update(targetId, { role });
}
```
-e 

---

# Input Validation, Sanitization & Injection Prevention

## ValidationPipe — Global Configuration

```typescript
// main.ts — the single most important security setting in NestJS
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,              // silently strips unknown fields
    forbidNonWhitelisted: true,   // throws 400 if unknown fields sent
    transform: true,              // auto-converts strings to declared types
    transformOptions: { enableImplicitConversion: true },
    disableErrorMessages: false,  // set true in production to hide field names
    stopAtFirstError: false,      // return ALL validation errors at once
  }),
);
```

**What `whitelist: true` prevents:**
Mass-assignment attacks — an attacker sending `{ "role": "admin" }` extra fields are silently dropped before the DTO is constructed.

---

## DTO Validation Patterns

### String Fields — Always Trim and Limit Length

```typescript
import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateServiceDto {
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  @Transform(({ value }) => value?.toString().trim()) // trim whitespace
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  @Transform(({ value }) => value?.toString().trim())
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsUrl({}, { message: 'iconUrl must be a valid URL' })
  iconUrl?: string;
}
```

**Always apply `@MaxLength`** — unbounded strings can cause DB errors or payload attacks.

---

### Enum Validation

```typescript
import { IsEnum } from 'class-validator';

export class UpdateUserRoleDto {
  @IsEnum(Role, { message: `role must be one of: ${Object.values(Role).join(', ')}` })
  role: Role;
}
```

Never accept raw strings for fields that map to finite values. Always use enums + `@IsEnum()`.

---

### Number & Amount Validation (Stripe Payments)

```typescript
import { IsNumber, IsPositive, Min, Max } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(0.5)   // Stripe minimum charge
  @Max(99999) // hard cap to prevent accidental large charges
  amount: number;

  @IsOptional()
  @IsEnum(['usd', 'eur', 'gbp'])
  currency?: string = 'usd';

  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => value?.trim())
  description: string;
}
```

---

### UUID Param Validation

```typescript
// Always use ParseUUIDPipe — never trust raw :id params
@Get(':id')
findOne(@Param('id', ParseUUIDPipe) id: string) {
  return this.service.findOne(id);
}

// ParseUUIDPipe rejects non-UUID strings, preventing injection via URL params
// "' OR 1=1--" → 400 Bad Request (never reaches the DB)
```

---

## SQL Injection Prevention

### Safe — TypeORM Parameterized Queries

```typescript
// SAFE — parameterized via findOne
const article = await this.repo.findOne({ where: { slug } });

// SAFE — QueryBuilder with parameters
const results = await this.repo
  .createQueryBuilder('article')
  .where('article.title ILIKE :search', { search: `%${search}%` })
  .andWhere('article.isPublished = :pub', { pub: true })
  .getMany();
```

### Dangerous — String Interpolation (NEVER DO)

```typescript
// ❌ NEVER — direct string interpolation = SQL injection
const results = await this.repo.query(
  `SELECT * FROM articles WHERE title LIKE '%${search}%'`,
);

// ❌ NEVER — even with template literals
.where(`article.slug = '${slug}'`)
```

**Rule:** Every value that comes from user input must be passed as a parameter object `{ key: value }` — never interpolated into the query string.

---

## XSS Prevention

NestJS APIs that return JSON are generally not directly vulnerable to XSS — but content stored in the DB and later rendered by the frontend can be. Apply these rules:

### Content Sanitization (Rich Text / HTML Fields)

```typescript
// Install: npm install sanitize-html
import sanitizeHtml from 'sanitize-html';

// articles.service.ts
async create(dto: CreateArticleDto): Promise<Article> {
  const sanitized = {
    ...dto,
    content: sanitizeHtml(dto.content, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat([
        'h1', 'h2', 'h3', 'img', 'figure', 'figcaption', 'pre', 'code',
      ]),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        img: ['src', 'alt', 'width', 'height'],
        a: ['href', 'target', 'rel'],
        code: ['class'],   // for syntax highlighting classes
      },
      // Never allow script, iframe, object, embed
    }),
  };
  const article = this.repo.create(sanitized);
  return this.repo.save(article);
}
```

**Rule:** Sanitize HTML content at write time (on create/update) — not at read time. This means the DB always contains clean content.

---

## File Upload Security

```typescript
// media/upload.interceptor.ts
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const SecureImageUpload = FileInterceptor('file', {
  storage: memoryStorage(), // never write to disk
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    // 1. Check MIME type (not file extension — extensions are trivially faked)
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return callback(
        new BadRequestException(
          `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
        ),
        false,
      );
    }
    callback(null, true);
  },
});

// In the service, before uploading to B2:
function sanitizeFileName(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  // UUID name prevents: path traversal, filename collision, original name exposure
  return `${uuidv4()}${ext}`;
}
```

**Security rules for file uploads:**
1. Always use `memoryStorage()` — never `diskStorage()` in production
2. Validate `file.mimetype`, not `file.originalname` extension
3. Rename every file to a UUID before storing — never preserve original names
4. Cap size at 5MB for images; reject anything above
5. Store files in Backblaze, never serve them from the API server

---

## Path Traversal Prevention

```typescript
// When constructing any file path from user input:
import * as path from 'path';

function safeFolderName(folder: string): string {
  // Normalize and strip any ../ sequences
  const normalized = path.normalize(folder).replace(/^(\.\.(\/|\\|$))+/, '');
  // Only allow alphanumeric, hyphens, underscores
  return normalized.replace(/[^a-z0-9_-]/gi, '');
}

// Usage: always sanitize the 'folder' query param before using in B2 key
const safeFolder = safeFolderName(rawFolder);
const key = `${safeFolder}/${uuidv4()}.${ext}`;
```
-e 

---

# Rate Limiting & Abuse Prevention

## ThrottlerModule Setup (Tiered Limits)

```typescript
// app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60_000,    // 1 minute window
        limit: 60,      // 60 requests per minute — general API
      },
      {
        name: 'auth',
        ttl: 900_000,   // 15 minutes window
        limit: 10,      // 10 attempts per 15 min — auth endpoints
      },
      {
        name: 'contact',
        ttl: 3_600_000, // 1 hour window
        limit: 5,       // 5 submissions per hour — contact form
      },
      {
        name: 'upload',
        ttl: 60_000,    // 1 minute window
        limit: 10,      // 10 uploads per minute — file uploads
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // applies 'global' tier to ALL routes by default
    },
  ],
})
export class AppModule {}
```

---

## Applying Tiers Per Endpoint

```typescript
// auth.controller.ts — strict limits on auth endpoints
@Post('login')
@Throttle({ auth: { limit: 10, ttl: 900_000 } }) // override global with 'auth' tier
async login(@Body() dto: LoginDto) { ... }

@Post('register')
@Throttle({ auth: { limit: 5, ttl: 900_000 } })
async register(@Body() dto: RegisterDto) { ... }

// contact.controller.ts
@Post()
@Throttle({ contact: { limit: 5, ttl: 3_600_000 } })
async submit(@Body() dto: CreateContactDto) { ... }

// payments.controller.ts — Stripe webhook MUST skip throttle
@Post('webhook')
@SkipThrottle()
async handleWebhook(
  @Headers('stripe-signature') sig: string,
  @Req() req: RawBodyRequest<Request>,
) { ... }

// media.controller.ts
@Post('upload')
@Throttle({ upload: { limit: 10, ttl: 60_000 } })
async upload(@UploadedFile() file: Express.Multer.File) { ... }
```

---

## Custom Throttler — IP + User Combined Key

By default, `ThrottlerGuard` keys by IP. For authenticated routes, key by user ID to prevent one user hammering the API from multiple IPs:

```typescript
// common/guards/custom-throttler.guard.ts
import { ThrottlerGuard } from '@nestjs/throttler';
import { ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Authenticated request → throttle by user ID
    if (req.user?.id) return `user:${req.user.id}`;
    // Anonymous → throttle by IP
    return req.ip ?? req.headers['x-forwarded-for'] ?? 'unknown';
  }
}
```

---

## Brute Force Protection on Login

```typescript
// auth.service.ts
private readonly MAX_FAILED_ATTEMPTS = 5;
private readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

async login(dto: LoginDto): Promise<AuthTokens> {
  const user = await this.usersService.findByEmail(dto.email);

  // Generic message — never reveal whether email exists
  const invalidMsg = 'Invalid email or password';

  if (!user) throw new UnauthorizedException(invalidMsg);

  // Check lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    throw new TooManyRequestsException(
      `Account locked due to too many failed attempts. Try again in ${minutes} minutes.`,
    );
  }

  const isValid = await this.verifyPassword(dto.password, user.password);

  if (!isValid) {
    const attempts = (user.failedLoginAttempts ?? 0) + 1;

    if (attempts >= this.MAX_FAILED_ATTEMPTS) {
      // Lock the account
      await this.usersService.updateLoginAttempts(user.id, {
        failedLoginAttempts: attempts,
        lockedUntil: new Date(Date.now() + this.LOCKOUT_DURATION_MS),
      });
      throw new TooManyRequestsException(
        'Account locked for 15 minutes due to too many failed login attempts.',
      );
    }

    await this.usersService.updateLoginAttempts(user.id, { failedLoginAttempts: attempts });
    throw new UnauthorizedException(invalidMsg);
  }

  // Success — reset counters
  await this.usersService.updateLoginAttempts(user.id, {
    failedLoginAttempts: 0,
    lockedUntil: null,
  });

  return this.generateTokens(user);
}
```

**Required entity columns:**
```typescript
@Column({ default: 0 })
failedLoginAttempts: number;

@Column({ nullable: true })
lockedUntil: Date;
```

---

## Timing Attack Prevention

```typescript
// WRONG — reveals whether user exists via response time
async login(dto: LoginDto) {
  const user = await this.usersRepo.findOne({ where: { email: dto.email } });
  if (!user) throw new UnauthorizedException('Invalid credentials');
  const valid = await bcrypt.compare(dto.password, user.password);
  if (!valid) throw new UnauthorizedException('Invalid credentials');
}

// CORRECT — always run bcrypt.compare, even for non-existent users
const DUMMY_HASH = '$2b$12$dummy.hash.to.prevent.timing.attacks.on.login.endpoint';

async login(dto: LoginDto) {
  const user = await this.usersRepo.findOne({ where: { email: dto.email } });
  const hash = user?.password ?? DUMMY_HASH;

  // Always compare — constant time regardless of whether user exists
  const isValid = await bcrypt.compare(dto.password, hash);

  if (!user || !isValid) {
    throw new UnauthorizedException('Invalid email or password');
  }
  return this.generateTokens(user);
}
```

---

## Response Headers Against Fingerprinting

```typescript
// Intercept all responses to remove version info
@Injectable()
export class SecurityHeadersInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(() => {
        // Headers are set on the response object before this runs
        // helmet() handles most of this — this is for extra custom headers
      }),
    );
  }
}
```

The key fingerprinting removal is in helmet + removing `X-Powered-By`. Also ensure your error messages don't expose framework names, versions, or internal paths.
-e 

---

# Secrets & Configuration Management

## Environment Variable Strategy

### Required Env Variables — Validated at Startup

```typescript
// config/env.validation.ts
import { plainToInstance } from 'class-transformer';
import { IsString, IsNumber, IsIn, MinLength, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsIn(['development', 'production', 'test'])
  NODE_ENV: string;

  @IsNumber()
  PORT: number;

  @IsString()
  @MinLength(10)
  DATABASE_URL: string;

  @IsString()
  FRONTEND_URL: string;

  @IsString()
  @MinLength(64, { message: 'JWT_SECRET must be at least 64 characters — use a random generator' })
  JWT_SECRET: string;

  @IsString()
  @MinLength(64)
  JWT_REFRESH_SECRET: string;

  @IsString()
  @MinLength(10)
  STRIPE_SECRET_KEY: string;

  @IsString()
  @MinLength(10)
  STRIPE_WEBHOOK_SECRET: string;

  @IsString()
  B2_APPLICATION_KEY_ID: string;

  @IsString()
  B2_APPLICATION_KEY: string;

  @IsString()
  B2_BUCKET_NAME: string;

  @IsString()
  B2_ENDPOINT: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    // App CRASHES at startup if any required env var is missing or invalid
    throw new Error(`Environment validation failed:\n${errors.toString()}`);
  }
  return validated;
}

// app.module.ts
ConfigModule.forRoot({
  isGlobal: true,
  validate: validateEnv, // crash early, crash loud
}),
```

**Why crash on startup?** A missing `STRIPE_WEBHOOK_SECRET` discovered in production at 2am after a customer payment is far worse than the app refusing to start during deployment.

---

## .env File Management

### `.env` (never committed)
```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Neon PostgreSQL
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/portfolio?sslmode=require

# JWT — generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<64-char-random-hex>
JWT_REFRESH_SECRET=<64-char-random-hex>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# Backblaze B2
B2_APPLICATION_KEY_ID=your_key_id
B2_APPLICATION_KEY=your_application_key
B2_BUCKET_ID=your_bucket_id
B2_BUCKET_NAME=portfolio-bucket
B2_ENDPOINT=https://s3.us-west-004.backblazeb2.com

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_CURRENCY=usd
```

### `.env.example` (committed to Git — dummy values only)
```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
JWT_SECRET=generate-with-crypto-randomBytes-64-hex
JWT_REFRESH_SECRET=generate-with-crypto-randomBytes-64-hex
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
B2_APPLICATION_KEY_ID=your_b2_key_id
B2_APPLICATION_KEY=your_b2_application_key
B2_BUCKET_ID=your_bucket_id
B2_BUCKET_NAME=your_bucket_name
B2_ENDPOINT=https://s3.us-west-004.backblazeb2.com
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_CURRENCY=usd
```

### `.gitignore` — mandatory entries
```gitignore
.env
.env.local
.env.production
.env.staging
*.pem
*.key
dist/
node_modules/
```

---

## Typed Config Services (Avoid Raw `process.env`)

```typescript
// config/stripe.config.ts
import { registerAs } from '@nestjs/config';

export const stripeConfig = registerAs('stripe', () => ({
  secretKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  currency: process.env.STRIPE_CURRENCY ?? 'usd',
}));

// payments.service.ts — inject typed config
constructor(
  @Inject(stripeConfig.KEY)
  private readonly stripe: ConfigType<typeof stripeConfig>,
) {}

// Access: this.stripe.secretKey  ← typed, autocompleted, no magic strings
```

---

## JWT Secret Generation

```bash
# Generate a cryptographically secure 64-byte hex secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 64
```

**Rules:**
- Never use a memorable passphrase as JWT secret
- Never reuse the access token secret for refresh tokens — they must be different keys
- Rotate secrets by issuing new ones and deploying; old tokens will be invalid immediately

---

## Stripe Key Hygiene

```typescript
// payments.service.ts
// At startup, verify the Stripe key looks valid before accepting traffic
async onModuleInit() {
  try {
    await this.stripeService.client.paymentMethods.list({ limit: 1 });
  } catch (err) {
    if (err.type === 'StripeAuthenticationError') {
      throw new Error('STRIPE_SECRET_KEY is invalid — check environment variables');
    }
    // Other errors (network, etc.) are acceptable at startup
  }
}
```

Use `sk_test_` keys in development/staging. **Never** use `sk_live_` in development. Protect live keys with Stripe's restricted key feature to limit their scope.
-e 

---

# Security Logging & Audit Trails

## What to Log vs What NOT to Log

### Always Log (Security Events)
- Failed authentication attempts (with IP, timestamp, email — NOT password)
- Successful logins (user ID, IP, timestamp)
- Permission denied / Forbidden errors (user ID, route, role)
- JWT errors (expired, invalid, missing)
- Stripe webhook events received (event type, payment intent ID)
- Payment status changes
- File uploads / deletions (user ID, file key, timestamp)
- Admin actions (who changed what, on which resource)
- Account lockouts triggered

### Never Log (Sensitive Data)
- Passwords (plain or hash)
- JWT tokens (full token string)
- Stripe secret keys or webhook secrets
- Full credit card details
- Raw request bodies for auth endpoints
- User passwords in any form

---

## Security Logger Service

```typescript
// common/services/security-logger.service.ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SecurityLoggerService {
  private readonly logger = new Logger('SECURITY');

  authSuccess(userId: string, ip: string) {
    this.logger.log(`AUTH_SUCCESS | user=${userId} | ip=${ip}`);
  }

  authFailure(email: string, ip: string, reason: string) {
    // Log email for investigation — but NEVER the attempted password
    this.logger.warn(`AUTH_FAILURE | email=${email} | ip=${ip} | reason=${reason}`);
  }

  accountLocked(userId: string, ip: string) {
    this.logger.warn(`ACCOUNT_LOCKED | user=${userId} | ip=${ip}`);
  }

  permissionDenied(userId: string, route: string, requiredRole: string) {
    this.logger.warn(
      `PERMISSION_DENIED | user=${userId} | route=${route} | required=${requiredRole}`,
    );
  }

  paymentEvent(eventType: string, paymentIntentId: string, status: string) {
    this.logger.log(
      `PAYMENT_EVENT | type=${eventType} | intent=${paymentIntentId} | status=${status}`,
    );
  }

  webhookSignatureFailure(ip: string) {
    this.logger.error(`WEBHOOK_SIGNATURE_INVALID | ip=${ip}`);
  }

  adminAction(adminId: string, action: string, targetId: string, resource: string) {
    this.logger.log(
      `ADMIN_ACTION | admin=${adminId} | action=${action} | target=${targetId} | resource=${resource}`,
    );
  }

  fileAction(userId: string, action: 'upload' | 'delete', fileKey: string) {
    this.logger.log(`FILE_${action.toUpperCase()} | user=${userId} | key=${fileKey}`);
  }
}
```

---

## Global Exception Filter with Security Logging

```typescript
// common/filters/global-exception.filter.ts
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
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : res;

      // Log security-relevant HTTP exceptions
      if (status === 401) {
        this.logger.warn(
          `UNAUTHORIZED | path=${request.url} | ip=${request.ip} | msg=${JSON.stringify(message)}`,
        );
      }
      if (status === 403) {
        this.logger.warn(
          `FORBIDDEN | path=${request.url} | user=${(request as any).user?.id} | ip=${request.ip}`,
        );
      }
    } else {
      // Unexpected error — log full stack, but NEVER expose it to client
      this.logger.error(
        `UNHANDLED_ERROR | path=${request.url} | ip=${request.ip}`,
        (exception as Error)?.stack,
      );
    }

    // In production: never expose internal error details
    const isProduction = process.env.NODE_ENV === 'production';
    const clientMessage =
      status === 500 && isProduction ? 'Internal server error' : message;

    response.status(status).json({
      statusCode: status,
      message: clientMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

---

## Audit Log Entity (Admin Actions)

For a portfolio site with an admin dashboard, track all data-modifying actions:

```typescript
// entities/audit-log.entity.ts
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'admin_id' })
  adminId: string;

  @Column({ length: 50 })
  action: string; // 'CREATE' | 'UPDATE' | 'DELETE' | 'PUBLISH' | 'REFUND'

  @Column({ length: 50 })
  resource: string; // 'article' | 'project' | 'service' | 'payment' | 'user'

  @Column({ name: 'resource_id', nullable: true })
  resourceId: string;

  @Column({ type: 'jsonb', nullable: true })
  changes: Record<string, any>; // { before: {...}, after: {...} }

  @Column({ nullable: true })
  ip: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

// common/decorators/audit.decorator.ts
export const Audit = (action: string, resource: string): MethodDecorator =>
  (target, key, descriptor: PropertyDescriptor) => {
    const original = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const result = await original.apply(this, args);
      // AuditService is injected via module — log after successful operation
      return result;
    };
    return descriptor;
  };
```

---

## Logging Configuration

```typescript
// main.ts — structured logging in production
const app = await NestFactory.create(AppModule, {
  logger:
    process.env.NODE_ENV === 'production'
      ? ['error', 'warn', 'log']    // no verbose/debug in prod
      : ['error', 'warn', 'log', 'debug', 'verbose'],
});
```

In production, pipe logs to a service like **Logtail**, **Papertrail**, or **Railway logs** — never rely on console output alone. Log format should be parseable (structured JSON in production, human-readable in development).
-e 

---

# Dependency & Infrastructure Hardening

## Dependency Vulnerability Scanning

### npm audit (Built-in)

```bash
# Run on every deploy pipeline
npm audit

# Fix automatically where possible
npm audit fix

# Fix including breaking changes (review carefully)
npm audit fix --force

# Output JSON for CI parsing
npm audit --json | jq '.vulnerabilities | keys'
```

**CI/CD integration** — add to your pipeline:
```yaml
# .github/workflows/security.yml (GitHub Actions example)
- name: Security Audit
  run: npm audit --audit-level=high
  # Fails the build on HIGH or CRITICAL vulnerabilities
```

---

## Critical Packages to Keep Updated

| Package | Why It Matters |
|---|---|
| `@nestjs/core`, `@nestjs/common` | Framework patches |
| `class-validator`, `class-transformer` | Prototype pollution risks in older versions |
| `typeorm` | SQL injection patches |
| `passport`, `passport-jwt` | Auth bypass patches |
| `multer` | File upload security |
| `stripe` | API compatibility + security patches |
| `helmet` | New browser attack vectors |
| `jsonwebtoken` | JWT algorithm confusion attacks |
| `express` | HTTP parsing vulnerabilities |

```bash
# Check outdated packages
npm outdated

# Update a specific critical package
npm update helmet@latest
```

---

## Production Build Hardening

### package.json — Scripts

```json
{
  "scripts": {
    "build": "nest build",
    "start:prod": "node dist/main",
    "start:dev": "nest start --watch",
    "migration:run": "typeorm migration:run -d dist/data-source.js",
    "audit": "npm audit --audit-level=high"
  }
}
```

### Disable Development Endpoints in Production

```typescript
// main.ts
const isProduction = config.get('NODE_ENV') === 'production';

// Swagger — never expose in production
if (!isProduction) {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Portfolio API')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));
}

// Never expose health endpoints with internal details in production
if (!isProduction) {
  app.use('/health/details', detailedHealthCheck);
}
```

---

## Node.js Process Hardening

```typescript
// main.ts — handle unhandled errors to prevent crash-and-expose scenarios
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
  // Log to monitoring service here
  // Do NOT exit — NestJS global filter should catch HTTP errors
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Graceful shutdown
  process.exit(1);
});

// Graceful shutdown — don't drop in-flight requests
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks(); // handles SIGTERM / SIGINT

  await app.listen(3000);
}
```

---

## Neon (PostgreSQL) Security

```typescript
// Always use SSL for Neon — never allow plain connections
TypeOrmModule.forRootAsync({
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    url: config.get('DATABASE_URL'),
    ssl: {
      rejectUnauthorized: false, // Neon uses self-signed certs; this is safe with URL auth
    },
    synchronize: false,          // NEVER true in production
    logging: config.get('NODE_ENV') !== 'production',
    extra: {
      max: 5,                    // Neon free tier connection limit
      connectionTimeoutMillis: 5000,
    },
  }),
}),
```

**Neon security rules:**
- Connection string includes credentials — never log the full `DATABASE_URL`
- Use Neon's IP allowlist feature if available on your plan
- Use separate Neon roles for read-only reporting vs. read-write operations if the app grows

---

## Backblaze B2 Security

```typescript
// Always use application keys scoped to ONE bucket — not master keys
// In Backblaze dashboard:
// 1. Go to App Keys → Add a New Application Key
// 2. Set "Allow access to Bucket(s)" → select your specific bucket only
// 3. Set file name prefix if needed for extra restriction
// 4. Copy the key immediately — it's shown once

// In code, never expose the B2 endpoint URL from user input
const ALLOWED_B2_FOLDERS = ['services/icons', 'services/covers', 'projects/covers',
  'projects/gallery', 'articles/covers', 'users/avatars'] as const;

type B2Folder = typeof ALLOWED_B2_FOLDERS[number];

function isValidFolder(folder: string): folder is B2Folder {
  return ALLOWED_B2_FOLDERS.includes(folder as B2Folder);
}

// In upload service — reject unknown folders
async upload(file: Express.Multer.File, folder: string) {
  if (!isValidFolder(folder)) {
    throw new BadRequestException(`Invalid storage folder: ${folder}`);
  }
  // proceed with upload
}
```

---

## Security Headers Verification

Use these tools to verify your deployed API's security headers:

```bash
# Quick header check via curl
curl -I https://your-api.com/api/v1/articles

# Check for: Strict-Transport-Security, X-Content-Type-Options,
#            X-Frame-Options, Content-Security-Policy

# Online scanners
# https://securityheaders.com — paste your API URL
# https://observatory.mozilla.org — comprehensive scoring
```

Expected headers in a hardened NestJS API:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Content-Security-Policy: default-src 'self'
Referrer-Policy: no-referrer
X-DNS-Prefetch-Control: off
```

---

## Pre-Deploy Security Checklist

```bash
# 1. Audit dependencies
npm audit --audit-level=high

# 2. Check for accidentally committed secrets
git log --all --full-history -- .env
npx truffleHog git file://. --only-verified  # or use git-secrets

# 3. Verify no synchronize:true in production config
grep -r "synchronize: true" src/

# 4. Verify no hardcoded secrets
grep -rE "(sk_live|whsec_|password\s*=\s*['\"])" src/ --include="*.ts"

# 5. Build check
npm run build && echo "Build OK"

# 6. Run migrations dry-run
npx typeorm migration:show -d dist/data-source.js
```