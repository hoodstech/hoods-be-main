# Architecture Overview

[Русская версия](./ARCHITECTURE.ru.md)

## Project Structure

```
hoods-be-main/
├── src/
│   ├── config/              # Configuration management
│   │   ├── env.ts          # Environment variables validation (Zod)
│   │   ├── oauth.ts        # Google OAuth configuration
│   │   └── index.ts        # Config exports
│   │
│   ├── db/                  # Database layer
│   │   ├── migrations/     # Drizzle migration files (auto-generated)
│   │   ├── schemas/        # Database table schemas
│   │   │   ├── users.schema.ts
│   │   │   └── index.ts
│   │   ├── index.ts        # Database connection setup
│   │   └── migrate.ts      # Migration runner script
│   │
│   ├── repositories/        # Data access layer (Repository pattern)
│   │   ├── base.repository.ts
│   │   ├── user.repository.ts
│   │   └── index.ts
│   │
│   ├── services/            # Business logic layer
│   │   ├── auth.service.ts
│   │   └── index.ts
│   │
│   ├── routes/              # API routes/controllers
│   │   ├── auth.routes.ts
│   │   └── index.ts
│   │
│   ├── middlewares/         # Custom middleware
│   │   ├── auth.middleware.ts
│   │   └── index.ts
│   │
│   ├── types/               # TypeScript type definitions
│   │   ├── auth.types.ts
│   │   └── index.ts
│   │
│   ├── app.ts               # Fastify application setup
│   └── index.ts             # Application entry point
│
├── .vscode/                 # VS Code settings
├── docker-compose.development.yml
├── docker-compose.production.yml
├── Dockerfile
├── .dockerignore
├── .env.development         # Development environment variables
├── .env.production          # Production environment variables
├── .gitignore
├── drizzle.config.ts        # Drizzle Kit configuration
├── eslint.config.mjs        # ESLint configuration
├── package.json
├── tsconfig.json            # TypeScript configuration
├── README.md
├── README.ru.md
├── ARCHITECTURE.md          # This file
└── ARCHITECTURE.ru.md
```

## Architectural Patterns

### 1. Layered Architecture

The application follows a strict layered architecture:

```
┌─────────────────────────────────────┐
│         Routes (API Layer)          │  ← HTTP requests/responses
├─────────────────────────────────────┤
│      Services (Business Logic)      │  ← Business rules
├─────────────────────────────────────┤
│   Repositories (Data Access Layer)  │  ← Database queries
├─────────────────────────────────────┤
│      Database (PostgreSQL)          │  ← Data persistence
└─────────────────────────────────────┘
```

**Benefits:**
- Clear separation of concerns
- Easy to test each layer independently
- Changes in one layer don't affect others
- Scalable and maintainable

### 2. Repository Pattern

The Repository pattern abstracts database operations:

```typescript
// Base repository provides common functionality
abstract class BaseRepository {
  constructor(protected db: Database) {}
}

// Specific repositories implement domain logic
class UserRepository extends BaseRepository {
  async findById(id: string): Promise<User | undefined> { }
  async findByEmail(email: string): Promise<User | undefined> { }
  async create(user: NewUser): Promise<User> { }
}
```

**Benefits:**
- Centralized data access logic
- Easy to mock for testing
- Database-agnostic business logic
- Reusable queries

### 3. Dependency Injection

Services and repositories are injected, not instantiated directly:

```typescript
// In app.ts
const userRepository = new UserRepository(db);
const authService = new AuthService(userRepository);
await authRoutes(app, authService);
```

**Benefits:**
- Loose coupling
- Easy to test with mocks
- Flexible configuration

### 4. Middleware Pattern

Authentication is handled via reusable middleware:

```typescript
// Protected route
fastify.get('/auth/me', {
  preHandler: requireAuth  // Middleware injection
}, async (request, reply) => {
  // request.userId is now available
});
```

## Data Flow

### Authentication Flow (Google OAuth)

```
User clicks "Login with Google"
    ↓
GET /auth/google (Fastify OAuth2 plugin)
    ↓
Redirects to Google OAuth
    ↓
User authorizes
    ↓
GET /auth/google/callback
    ↓
Exchange code for access token
    ↓
Fetch user profile from Google
    ↓
AuthService.handleGoogleCallback()
    ↓
UserRepository.findByGoogleId() or create()
    ↓
Set session cookie
    ↓
Return user data
```

### Protected Route Flow

```
Request with cookie
    ↓
requireAuth middleware
    ↓
Extract userId from cookie
    ↓
Attach to request.userId
    ↓
Route handler
    ↓
Service layer
    ↓
Repository layer
    ↓
Database query
    ↓
Response
```

## Technology Stack

### Core
- **TypeScript**: Type safety and better developer experience
- **Fastify**: Fast and efficient web framework
- **PostgreSQL**: Reliable relational database
- **Drizzle ORM**: Type-safe database queries

### Authentication
- **@fastify/oauth2**: OAuth 2.0 client implementation
- **@fastify/cookie**: Session management via cookies

### Development
- **tsx**: Fast TypeScript execution
- **ESLint**: Code quality and consistency
- **Drizzle Kit**: Database migrations

### Deployment
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration

## Design Principles

### 1. Single Responsibility
Each module has one reason to change:
- Routes handle HTTP
- Services handle business logic
- Repositories handle data access

### 2. DRY (Don't Repeat Yourself)
- Base repository for common operations
- Centralized configuration
- Reusable middleware

### 3. SOLID Principles
- **S**: Each class has one responsibility
- **O**: Services can be extended without modification
- **L**: Repositories are substitutable
- **I**: Small, focused interfaces
- **D**: Depend on abstractions (Database interface)

### 4. Path Aliases
Using `~` for cleaner imports:
```typescript
import { db } from '~/db/index.js';
import { UserRepository } from '~/repositories/index.js';
```

## Extensibility

### Adding a New Feature

Example: Adding a Posts feature

1. **Schema** ([src/db/schemas/posts.schema.ts](src/db/schemas/posts.schema.ts)):
```typescript
export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  createdAt: timestamp('created_at').defaultNow()
});
```

2. **Repository** ([src/repositories/post.repository.ts](src/repositories/post.repository.ts)):
```typescript
export class PostRepository extends BaseRepository {
  async findByUserId(userId: string) {
    return this.db.select().from(posts)
      .where(eq(posts.userId, userId));
  }
}
```

3. **Service** ([src/services/post.service.ts](src/services/post.service.ts)):
```typescript
export class PostService {
  constructor(private postRepository: PostRepository) {}

  async getUserPosts(userId: string) {
    return this.postRepository.findByUserId(userId);
  }
}
```

4. **Routes** ([src/routes/post.routes.ts](src/routes/post.routes.ts)):
```typescript
export async function postRoutes(
  fastify: FastifyInstance,
  postService: PostService
) {
  fastify.get('/posts', {
    preHandler: requireAuth
  }, async (request) => {
    return postService.getUserPosts(request.userId!);
  });
}
```

5. **Register** in [src/app.ts](src/app.ts):
```typescript
const postRepository = new PostRepository(db);
const postService = new PostService(postRepository);
await postRoutes(app, postService);
```

## Best Practices

### 1. Type Safety
- Use Drizzle's inferred types
- Validate environment variables with Zod
- Define clear interfaces for DTOs

### 2. Error Handling
- Return appropriate HTTP status codes
- Use try-catch in route handlers
- Log errors for debugging

### 3. Security
- Never commit `.env` files
- Use HTTPS in production
- Implement rate limiting
- Validate all inputs
- Use prepared statements (Drizzle handles this)

### 4. Database Migrations
- Always generate migrations: `npm run db:generate`
- Review migration files before applying
- Run migrations before starting the app

### 5. Code Style
- Follow ESLint rules
- No trailing commas
- Single quotes
- 2-space indentation
- Absolute imports with `~` for internal modules

## Performance Considerations

### 1. Database
- Use indexes on frequently queried columns
- Connection pooling (handled by postgres.js)
- Lazy loading of relationships

### 2. Caching
- Consider Redis for session storage in production
- Cache frequently accessed data

### 3. Docker
- Multi-stage builds for smaller images
- Non-root user for security
- Health checks for reliability

## Testing Strategy (Future)

```
src/
├── __tests__/
│   ├── unit/           # Unit tests for services
│   ├── integration/    # Integration tests for repositories
│   └── e2e/            # End-to-end API tests
```

Recommended tools:
- **Vitest**: Fast unit testing
- **Testcontainers**: Integration tests with real PostgreSQL
- **Supertest**: API endpoint testing

## Monitoring (Future)

- Add structured logging (pino)
- Implement metrics (Prometheus)
- Add APM (Application Performance Monitoring)
- Set up alerts for errors
