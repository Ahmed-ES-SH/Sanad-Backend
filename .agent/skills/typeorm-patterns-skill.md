# TypeORM Patterns — Claude Skill
> A production-focused skill document covering entity design, migrations, query optimization, indexing, relations, and repository patterns for NestJS projects using TypeORM.

---

## SKILL.md (Entry Point)

---
name: typeorm-patterns
description: >
  Expert TypeORM guidance for NestJS projects covering entity design, relations,
  migrations, query optimization, indexes, repository usage, and performance.
  Use this skill whenever the user asks to write, review, refactor, or scaffold
  ANY TypeORM code — including entities, migrations, repositories, QueryBuilder
  queries, subscribers, data source configuration, indexes, or relation mapping.
  Also trigger for questions about schema workflow, migration safety, performance
  tuning, pagination, or database design in a TypeORM context. When in doubt,
  use this skill — it is the definitive reference for TypeORM patterns.
---

# TypeORM Patterns Skill

You are an expert NestJS + TypeORM engineer. When writing or reviewing TypeORM code, always
follow the principles and patterns in this skill. Load only the reference sections relevant
to the current task.

## Reference Files

| File | Load When |
|---|---|
| `references/entity-design.md` | Entity structure, columns, relations, decorators, hooks |
| `references/migrations.md` | Migration workflow, schema changes, QueryRunner usage |
| `references/query-optimization.md` | QueryBuilder, pagination, select shaping, N+1 prevention |
| `references/indexes.md` | Index strategy, composite indexes, unique constraints, performance |
| `references/repository-patterns.md` | Repository APIs, transactions, custom methods, soft deletes |

---

## Core Principles (Always Apply)

1. **Schema First** — Model the database intentionally. Every column, relation, and index must have a reason.
2. **Explicit over Implicit** — Name columns, constraints, and relations clearly. Avoid hidden behavior.
3. **Production Safe** — Never rely on schema sync in production. Use migrations for all schema changes.
4. **Query Less** — Fetch only the data you need. Avoid loading large graphs by default.
5. **Index for Access Patterns** — Add indexes only for real query patterns, not guesses.
6. **No Raw SQL by Default** — Prefer repository methods or QueryBuilder. If raw SQL is necessary, parameterize everything.
7. **Fail Fast** — Validate schema assumptions in code and throw domain errors early.
8. **Consistency Over Cleverness** — Keep entity naming, migration naming, and query patterns predictable.

---

## Quick Checklists

### New Entity Checklist
- [ ] Entity file uses `@Entity()` with a clear table name
- [ ] Primary key is UUID unless there is a strong reason not to
- [ ] Column names use explicit `name:` mapping for database naming consistency
- [ ] Nullable fields are intentional and documented
- [ ] Relations define owning side and `onDelete` behavior
- [ ] Indexes exist for lookup, filter, sort, and uniqueness columns
- [ ] `@CreateDateColumn` / `@UpdateDateColumn` are used when appropriate
- [ ] Computed fields use hooks or subscribers, not service-layer duplication

### Migration Checklist
- [ ] Migration generated from entity changes or written with QueryRunner
- [ ] Migration name describes the schema change clearly
- [ ] Down migration reverses the change safely
- [ ] No destructive change without a backup or rollout plan
- [ ] Migration reviewed before running in shared environments
- [ ] Never edit a migration after it has been applied

### Query Review Checklist
- [ ] No N+1 query pattern
- [ ] `select` used to avoid fetching unused columns
- [ ] Pagination applied to every list endpoint
- [ ] QueryBuilder used for joins, aggregations, or complex filters
- [ ] Query parameters are bound, not interpolated
- [ ] Indexes support the most common `WHERE` / `ORDER BY` patterns
- [ ] Large relations are loaded intentionally, not by accident

---

# Entity Design

## Entity Definition Pattern

```typescript
// entities/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['status', 'createdAt'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ length: 180, unique: true })
  email: string;

  @Column({ name: 'phone_number', length: 30, nullable: true })
  phoneNumber?: string;

  @Column({ length: 20, default: 'active' })
  status: 'active' | 'blocked' | 'pending';

  @Column({ name: 'password_hash', select: false })
  passwordHash: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  normalizeEmail() {
    this.email = this.email?.trim().toLowerCase();
  }

  @BeforeInsert()
  @BeforeUpdate()
  trimNames() {
    this.firstName = this.firstName?.trim();
    this.lastName = this.lastName?.trim();
  }
}
```

**Rules:**
- Use `@Entity('table_name')` with explicit table names
- Use UUID primary keys for public-facing entities
- Use `select: false` for secrets like password hashes and tokens
- Use `@CreateDateColumn` / `@UpdateDateColumn` instead of manual timestamps
- Use lifecycle hooks for deterministic normalization only — not business logic

---

## Column Design Rules

```typescript
@Column({ name: 'is_active', default: true })
isActive: boolean;

@Column({ type: 'decimal', precision: 12, scale: 2 })
amount: string;

@Column({ type: 'jsonb', nullable: true })
metadata?: Record<string, unknown>;

@Column({ type: 'timestamp', nullable: true })
deletedAt?: Date;
```

**Rules:**
- Use database-native types deliberately
- Use `decimal` for money — never `float`
- Use `jsonb` for flexible structured data in PostgreSQL
- Mark nullable fields explicitly
- Match TypeScript types to the actual DB storage behavior

---

## Relation Design

```typescript
@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.orders, {
    onDelete: 'RESTRICT',
    nullable: false,
  })
  @JoinColumn({ name: 'user_id' })
  user: User;
}

@Entity('users')
export class User {
  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];
}
```

**Rules:**
- Store the foreign key column separately for fast filtering and simpler joins
- Define `onDelete` behavior intentionally
- Prefer `RESTRICT` for financial or audit-critical records
- Avoid eager loading unless the relation is truly always needed
- Use `ManyToOne` / `OneToMany` carefully to avoid accidental oversized responses

---

## Entity Hooks

```typescript
@BeforeInsert()
@BeforeUpdate()
calculateSlug() {
  this.slug = this.title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

**Rules:**
- Use hooks for deterministic transformations only
- Do not place API calls or external side effects in entity hooks
- Keep hooks pure and predictable
- Prefer subscribers for cross-entity concerns

---

# Repository Patterns

## Basic Repository Injection

```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}
}
```

**Rules:**
- Inject repositories via constructor only
- Do not instantiate repositories manually
- Keep repository access inside services, not controllers

---

## Find Pattern

```typescript
async findByEmail(email: string): Promise<User | null> {
  return this.usersRepository.findOne({
    where: { email: email.toLowerCase().trim() },
  });
}
```

**Rules:**
- Normalize inputs before querying
- Use `findOne` for simple lookups
- Return `null` internally only when the caller can handle it explicitly
- For public service methods, prefer `findOneOrFail`-style behavior or custom exceptions

---

## Save Pattern

```typescript
async createUser(dto: CreateUserDto): Promise<User> {
  const user = this.usersRepository.create({
    ...dto,
    email: dto.email.toLowerCase().trim(),
  });

  return this.usersRepository.save(user);
}
```

**Rules:**
- Call `repository.create()` before `save()`
- Never mutate plain DTOs and assume they are entities
- Keep persistence logic inside the service layer

---

## Transaction Pattern

```typescript
await this.dataSource.transaction(async (manager) => {
  const orderRepo = manager.getRepository(Order);
  const paymentRepo = manager.getRepository(Payment);

  const order = await orderRepo.save(orderRepo.create({ userId, total }));
  await paymentRepo.save(paymentRepo.create({ orderId: order.id, status: 'pending' }));
});
```

**Rules:**
- Use transactions for multi-write operations that must stay consistent
- Keep all related writes inside the same transaction
- Never mix transactional and non-transactional writes in the same flow
- Prefer the transaction manager repositories inside the transaction boundary

---

# Query Optimization

## Select Only Needed Columns

```typescript
const users = await this.usersRepository.find({
  select: {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    status: true,
    createdAt: true,
  },
  where: { status: 'active' },
});
```

**Rules:**
- Never fetch large text, JSON, or secret columns unless required
- Keep list endpoints lightweight
- Use separate detail endpoints for full records

---

## QueryBuilder Pattern

```typescript
const users = await this.usersRepository
  .createQueryBuilder('user')
  .leftJoinAndSelect('user.orders', 'order')
  .where('user.status = :status', { status: 'active' })
  .andWhere('user.createdAt >= :from', { from: startDate })
  .orderBy('user.createdAt', 'DESC')
  .skip((page - 1) * limit)
  .take(limit)
  .getMany();
```

**Rules:**
- Use QueryBuilder for joins, grouped filters, aggregates, and dynamic conditions
- Use named parameters every time
- Never concatenate untrusted values into SQL fragments
- Keep query aliases short and consistent

---

## Aggregation Pattern

```typescript
const result = await this.ordersRepository
  .createQueryBuilder('order')
  .select('COUNT(order.id)', 'totalOrders')
  .addSelect('SUM(order.total)', 'revenue')
  .where('order.status = :status', { status: 'paid' })
  .getRawOne();
```

**Rules:**
- Use raw result queries only for aggregates
- Parse returned values into correct numeric types
- Keep aggregate queries separate from entity-loading queries when possible

---

## Pagination Pattern

```typescript
const [data, total] = await this.usersRepository.findAndCount({
  where: { status: 'active' },
  order: { createdAt: 'DESC' },
  skip: (page - 1) * limit,
  take: limit,
  select: {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    createdAt: true,
  },
});

return {
  data,
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
};
```

**Rules:**
- Apply pagination to every list endpoint
- Add deterministic ordering before paginating
- Use a maximum limit cap to protect the database

---

## N+1 Prevention

```typescript
const posts = await this.postsRepository.find({
  relations: {
    author: true,
    comments: true,
  },
});
```

**Rules:**
- Batch-load intentional relations
- Avoid relation access inside loops
- Prefer joined queries or separate batched queries over repeated repository calls
- Measure query count when performance matters

---

# Migration Workflow

## Production Workflow

```bash
# Generate migration from entity changes
npx typeorm migration:generate src/database/migrations/AddStatusToUsers -d src/data-source.ts

# Create empty migration
npx typeorm migration:create src/database/migrations/AddStatusToUsers

# Run migrations
npx typeorm migration:run -d src/data-source.ts

# Revert the last migration
npx typeorm migration:revert -d src/data-source.ts

# Show migration status
npx typeorm migration:show -d src/data-source.ts
```

**Rules:**
- Use migrations for schema changes in all shared environments
- Treat migrations as source control for the database
- Never use schema sync in production
- Never edit a migration after it has been applied

---

## QueryRunner Pattern

```typescript
import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddStatusToUsers1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'status',
        type: 'varchar',
        length: '20',
        isNullable: false,
        default: "'active'",
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_status_created_at',
        columnNames: ['status', 'created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('users', 'IDX_users_status_created_at');
    await queryRunner.dropColumn('users', 'status');
  }
}
```

**Rules:**
- Use QueryRunner for precise schema changes
- Write a real `down()` method for every migration
- Keep migration steps small and reversible
- Prefer explicit SQL changes when entity generation is not enough

---

## Schema Sync Rule

```typescript
{
  synchronize: false,
}
```

**Rules:**
- `synchronize` must be `false` in production and staging
- Never rely on auto-sync for critical systems
- Review generated SQL before any destructive schema change

---

# Index Strategy

## Column and Composite Indexes

```typescript
@Entity('orders')
@Index(['userId'])
@Index(['status', 'createdAt'])
@Index(['externalId'], { unique: true })
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ length: 30 })
  status: string;

  @Column({ name: 'external_id', length: 100 })
  externalId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

**Rules:**
- Index columns used in `WHERE`
- Index columns used in `ORDER BY`
- Index foreign keys
- Index unique lookup columns like email, slug, and external IDs
- Add composite indexes for common filter + sort combinations

---

## Unique Constraints vs Unique Indexes

```typescript
@Column({ unique: true })
slug: string;

@Index({ unique: true })
@Column()
email: string;
```

**Rules:**
- Use unique constraints for business identifiers
- Use unique indexes where query performance matters and uniqueness must be enforced
- Keep uniqueness naming consistent across the schema

---

## Index Caution

**Rules:**
- Do not add indexes to every column
- Every extra index has a write cost
- Remove unused indexes during performance audits
- Check actual query plans before adding complex indexes

---

# Relation and Loading Strategy

## Explicit Loading Pattern

```typescript
const order = await this.ordersRepository.findOne({
  where: { id },
  relations: {
    user: true,
    items: {
      product: true,
    },
  },
});
```

**Rules:**
- Load nested relations only when the endpoint needs them
- Avoid returning full entity graphs by default
- Use dedicated response DTOs for API output
- Be deliberate about what gets serialized to clients

---

## Soft Delete Pattern

```typescript
@DeleteDateColumn({ name: 'deleted_at', nullable: true })
deletedAt?: Date;
```

**Rules:**
- Use soft delete for reversible business data
- Use hard delete only when data must be permanently removed
- Add `deletedAt IS NULL` filters to active queries when using soft deletes
- Ensure indexes still support common non-deleted queries

---

# Data Source Setup

## NestJS + TypeORM Configuration

```typescript
TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    url: config.get<string>('DATABASE_URL'),
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
    synchronize: false,
    logging: config.get('NODE_ENV') === 'development',
  }),
});
```

**Rules:**
- Load entities and migrations from predictable paths
- Keep `synchronize` disabled
- Enable logging only when needed for debugging
- Use configuration values instead of hardcoded connection strings

---

# Common Anti-Patterns

## BAD — Fetching Everything

```typescript
const users = await this.usersRepository.find();
```

This often pulls unnecessary columns and can become expensive as the table grows.

---

## BAD — String Interpolation in Queries

```typescript
await this.usersRepository
  .createQueryBuilder('user')
  .where(`user.email = '${email}'`)
  .getOne();
```

**Rule:** Always bind parameters.

---

## BAD — Business Logic in Entity Hooks

```typescript
@BeforeInsert()
assignWelcomeCredits() {
  // don't call services here
}
```

**Rule:** Entity hooks must stay deterministic and isolated.

---

## BAD — Sync in Production

```typescript
{
  synchronize: true,
}
```

**Rule:** Never use this in production.

---

# Naming Conventions

## Entity and File Naming

- Entity class: `User`
- File name: `user.entity.ts`
- Migration class: `AddStatusToUsers1700000000000`
- Migration file: `1700000000000-AddStatusToUsers.ts`
- Repository variable: `usersRepository`
- Query alias: `user`

**Rules:**
- Keep names predictable and consistent
- Use singular entity class names
- Use plural table names when appropriate
- Name migrations by the schema change, not by a vague feature label

---

# Final Rules

1. Prefer simple repository methods for simple queries.
2. Use QueryBuilder for anything dynamic, relational, or aggregated.
3. Use migrations for every schema change that matters.
4. Add indexes based on actual access patterns.
5. Keep entities clean, intentional, and boring.
6. Never let convenience override database correctness.
7. Treat the database as production infrastructure, not a scratchpad.
