# Elementary Dices - Project Guide

## Project Overview

**Elementary Dices** is a dice rolling game built with:
- **Backend**: ElysiaJS (Bun runtime) with PostgreSQL
- **Frontend**: React (client workspace)
- **Database**: PostgreSQL with Knex migrations
- **Architecture**: Monorepo workspace structure (client, server, shared)

## Tech Stack

- **Runtime**: Bun
- **Backend Framework**: ElysiaJS v1.4+
- **Database**: PostgreSQL with Knex ORM
- **Type System**: TypeScript with strict mode
- **Package Manager**: Bun workspaces

## ElysiaJS Architecture Patterns

This project follows [ElysiaJS Best Practices](https://elysiajs.com/essential/best-practice.html) with a **feature-based architecture**.

### 1. Project Structure

Use feature-based organization for scalability and discoverability:

```
server/
├── index.ts                 # Main app entry, compose all features
├── db.ts                    # Database connection
├── modules/                 # Feature modules
│   ├── elementals/
│   │   ├── index.ts        # Controller (Elysia instance)
│   │   ├── service.ts      # Business logic
│   │   ├── repository.ts   # Data access layer
│   │   └── models.ts       # DTOs and validation schemas
│   ├── users/
│   │   ├── index.ts
│   │   ├── service.ts
│   │   ├── repository.ts
│   │   └── models.ts
│   └── dice-rolls/
│       ├── index.ts
│       ├── service.ts
│       ├── repository.ts
│       └── models.ts
├── shared/                  # Shared utilities
│   ├── errors.ts           # Custom error classes
│   ├── middleware.ts       # Shared middleware
│   └── utils.ts            # Helper functions
├── migrations/             # Database migrations
└── seeds/                  # Database seeds
```

### 2. Controller Pattern (Routes)

**Treat each Elysia instance as a controller** to maintain automatic type inference:

```typescript
// modules/users/index.ts
import { Elysia, t } from 'elysia';
import { UserService } from './service';
import { CreateUserDTO, UserResponseDTO } from './models';

export const usersModule = new Elysia({ prefix: '/api/users' })
  .decorate('userService', new UserService())
  .get('/', async ({ userService }) => {
    const users = await userService.findAll();
    return { users };
  })
  .get('/:id', async ({ params, userService }) => {
    const user = await userService.findById(params.id);
    return { user };
  })
  .post(
    '/',
    async ({ body, userService }) => {
      const user = await userService.create(body);
      return { user };
    },
    { body: CreateUserDTO }
  );
```

**✅ DO:**
- Use Elysia instances as controllers
- Destructure specific properties from Context
- Define routes directly on the instance
- Use `.decorate()` for dependency injection

**❌ DON'T:**
- Pass entire Context objects to services
- Create separate controller classes that need Elysia types
- Mix business logic with route handlers

### 3. Service Layer

Services contain business logic, decoupled from HTTP concerns:

```typescript
// modules/users/service.ts
import { UserRepository } from './repository';
import type { CreateUserData, User } from './models';

export class UserService {
  constructor(private repository = new UserRepository()) {}

  async findAll(): Promise<User[]> {
    return this.repository.findAll();
  }

  async findById(id: string): Promise<User | null> {
    return this.repository.findById(id);
  }

  async create(data: CreateUserData): Promise<User> {
    // Business logic here
    const existingUser = await this.repository.findByEmail(data.email);
    if (existingUser) {
      throw new Error('User already exists');
    }
    return this.repository.create(data);
  }
}
```

**✅ DO:**
- Keep services framework-agnostic
- Use constructor injection for dependencies
- Handle business logic and validation
- Throw descriptive errors

**❌ DON'T:**
- Import Elysia types in services
- Handle HTTP-specific logic (status codes, headers)
- Access request/response objects directly

### 4. Repository Layer

Repositories handle all database operations using Knex:

```typescript
// modules/users/repository.ts
import { db } from '../../db';
import type { CreateUserData, User } from './models';

export class UserRepository {
  private table = 'users';

  async findAll(): Promise<User[]> {
    return db(this.table).select('*');
  }

  async findById(id: string): Promise<User | null> {
    const [user] = await db(this.table).where({ id }).limit(1);
    return user || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await db(this.table).where({ email }).limit(1);
    return user || null;
  }

  async create(data: CreateUserData): Promise<User> {
    const [user] = await db(this.table).insert(data).returning('*');
    return user;
  }

  async update(id: string, data: Partial<CreateUserData>): Promise<User> {
    const [user] = await db(this.table)
      .where({ id })
      .update(data)
      .returning('*');
    return user;
  }

  async delete(id: string): Promise<void> {
    await db(this.table).where({ id }).delete();
  }
}
```

**✅ DO:**
- Encapsulate all database queries
- Use Knex query builder
- Return domain models
- Handle null cases explicitly

**❌ DON'T:**
- Put business logic in repositories
- Return database-specific types
- Throw generic errors without context

### 5. Data Models (DTOs)

Use **Elysia's type system as the single source of truth** for validation and types:

```typescript
// modules/users/models.ts
import { t } from 'elysia';

// DTOs for validation
export const CreateUserDTO = t.Object({
  email: t.String({ format: 'email' }),
  username: t.String({ minLength: 3, maxLength: 30 }),
  password: t.String({ minLength: 8 }),
});

export const UpdateUserDTO = t.Partial(CreateUserDTO);

export const UserResponseDTO = t.Object({
  id: t.String(),
  email: t.String(),
  username: t.String(),
  createdAt: t.String(),
});

// Extract TypeScript types from Elysia schemas
export type CreateUserData = typeof CreateUserDTO.static;
export type UpdateUserData = typeof UpdateUserDTO.static;
export type User = typeof UserResponseDTO.static;

// Group related models in namespaces
export namespace UserModels {
  export const Create = CreateUserDTO;
  export const Update = UpdateUserDTO;
  export const Response = UserResponseDTO;
}
```

**✅ DO:**
- Use `Elysia.t` for all validation
- Extract types with `typeof Schema.static`
- Group related models with namespaces
- Use Elysia's built-in validators (format, minLength, etc.)

**❌ DON'T:**
- Declare separate TypeScript interfaces
- Use class-based DTOs
- Duplicate type definitions
- Skip validation in favor of "type-only" interfaces

### 6. Error Handling

Create consistent error handling across the application:

```typescript
// shared/errors.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}
```

Use with `.onError()` hook:

```typescript
// index.ts
import { Elysia } from 'elysia';
import { AppError } from './shared/errors';

export const app = new Elysia()
  .onError(({ code, error, set }) => {
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return {
        error: error.message,
        code: error.code,
      };
    }

    // Handle Elysia validation errors
    if (code === 'VALIDATION') {
      set.status = 400;
      return {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.message,
      };
    }

    // Default error
    set.status = 500;
    return {
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    };
  });
```

### 7. Main Application Composition

Compose all modules in the main `index.ts`:

```typescript
// index.ts
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { db } from './db';

// Import modules
import { usersModule } from './modules/users';
import { elementalsModule } from './modules/elementals';
import { diceRollsModule } from './modules/dice-rolls';

export const app = new Elysia()
  .use(cors())
  .onError(/* error handler */)
  // Health check
  .get('/api/health', async () => {
    try {
      await db.raw('SELECT 1');
      return { status: 'ok', database: 'connected' };
    } catch (error) {
      return { status: 'error', database: 'disconnected' };
    }
  })
  // Register feature modules
  .use(usersModule)
  .use(elementalsModule)
  .use(diceRollsModule)
  .listen(3000);

export type App = typeof app;

// Graceful shutdown
process.on('SIGINT', async () => {
  await db.destroy();
  process.exit(0);
});
```

## Development Guidelines

### Database Migrations

Use Knex migrations for all schema changes:

```bash
# Create a new migration
bun run --filter @elementary-dices/server db:migrate:make migration_name

# Run migrations
bun run --filter @elementary-dices/server db:migrate

# Rollback last migration
bun run --filter @elementary-dices/server db:migrate:rollback
```

**Migration best practices:**
- Always create both `up()` and `down()` methods
- Use transactions for complex migrations
- Never modify existing migrations after they've been deployed
- Add indexes for foreign keys and frequently queried columns

### Testing

Test controllers using Elysia's `.handle()` method:

```typescript
import { describe, expect, it } from 'bun:test';
import { usersModule } from './modules/users';

describe('Users API', () => {
  it('should create a user', async () => {
    const response = await usersModule.handle(
      new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          username: 'testuser',
          password: 'password123',
        }),
      })
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.user.email).toBe('test@example.com');
  });
});
```

### Type Safety

- Enable strict TypeScript mode
- Use Elysia's type system for automatic type inference
- Extract types from Elysia schemas with `typeof Schema.static`
- Leverage Eden Treaty for type-safe client-server communication

### Code Style

- Use functional composition over classes where possible
- Prefer `async/await` over promises chains
- Use descriptive variable names
- Keep functions small and focused (single responsibility)
- Use optional chaining (`?.`) and nullish coalescing (`??`)

## Environment Variables

```bash
# server/.env
DATABASE_URL=postgresql://user:password@localhost:5432/elementary_dices
NODE_ENV=development
PORT=3000
```

Always use `.env.example` for documentation without sensitive values.

## Git Workflow

- Create feature branches from `main`
- Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`
- Keep commits atomic and focused
- Run migrations before committing schema changes
- Test locally before pushing

## Resources

- [ElysiaJS Documentation](https://elysiajs.com)
- [ElysiaJS Best Practices](https://elysiajs.com/essential/best-practice.html)
- [Knex.js Documentation](http://knexjs.org)
- [Bun Documentation](https://bun.sh/docs)

---

**Pattern Philosophy**: Remain pattern-agnostic. These guidelines adapt MVC principles to ElysiaJS specifics while allowing flexibility for your team's preferences. Focus on maintainability, type safety, and clear separation of concerns.
