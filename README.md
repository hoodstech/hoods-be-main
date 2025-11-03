# Hoods Backend

[Русская версия](./README.ru.md) | [Quick Start](./QUICKSTART.md) | [Architecture](./ARCHITECTURE.md)

A scalable backend API built with TypeScript, Fastify, PostgreSQL, and Drizzle ORM, featuring Google OAuth authentication and a clean repository pattern architecture.

**New to the project?** Check out the [Quick Start Guide](./QUICKSTART.md) to get up and running in 5 minutes!

## Features

- TypeScript for type safety
- Fastify web framework for high performance
- PostgreSQL database with Drizzle ORM
- Google OAuth 2.0 authentication
- Repository pattern for clean data access
- Layered architecture for scalability
- Environment-based configuration
- ESLint for code quality

## Project Architecture

```
src/
├── config/          # Configuration (env, OAuth)
├── db/              # Database setup and schemas
│   ├── migrations/  # Database migrations
│   └── schemas/     # Drizzle schemas
├── repositories/    # Repository pattern for data access
├── services/        # Business logic layer
├── routes/          # API route handlers
├── middlewares/     # Custom middleware
├── types/           # TypeScript type definitions
├── app.ts           # Fastify app setup
└── index.ts         # Application entry point
```

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- Google OAuth credentials

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup and Run

#### Option A: Using Docker (Recommended - Complete Stack)

Start the complete development stack (PostgreSQL + App) using Docker:

```bash
npm run docker:dev
```

This will:
- Start PostgreSQL container with credentials from [.env.development](.env.development)
- Start the application in a container with hot reload enabled
- Automatically run database migrations
- Create the admin user from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in .env
- Make the API available at http://localhost:3000
- Enable Swagger docs at http://localhost:3000/docs

The development container includes hot reload - any changes you make to `src/` files will automatically restart the server.

**You can skip steps 3-5 when using Docker!**

#### Option B: Manual Setup (Local Development)

If you prefer to run the app locally without Docker:

1. Install and start PostgreSQL locally
2. Create the database:
   ```bash
   createdb hoods_db
   ```
3. Continue with steps 3-5 below

### 3. Configure Environment

Copy the development environment file and update with your credentials:

```bash
cp .env.development .env
```

Update the following in `.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/hoods_db
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
COOKIE_SECRET=your-super-secret-cookie-key
```

#### Getting Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials > Create Credentials > OAuth 2.0 Client ID
5. Add authorized redirect URI: `http://localhost:3000/auth/google/callback`
6. Copy Client ID and Client Secret to your `.env` file

### 4. Generate and Run Migrations

```bash
# Generate migration files from schema
npm run db:generate

# Run migrations
npm run db:migrate
```

### 5. Start Development Server

```bash
npm run dev
```

The server will start at `http://localhost:3000`

## Available Scripts

### Development
- `npm run dev` - Start development server with hot reload
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors

### Database
- `npm run db:generate` - Generate migration files
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Drizzle Studio (database GUI)

### Production
- `npm run build` - Build for production
- `npm start` - Start production server

### Docker
- `npm run docker:dev` - Start full development stack (PostgreSQL + App with hot reload)
- `npm run docker:dev:down` - Stop development containers
- `npm run docker:prod` - Start production stack
- `npm run docker:prod:down` - Stop production containers
- `npm run docker:prod:build` - Rebuild and start production containers

**Note**: Development environment includes hot reload - changes to `src/` are automatically reflected in the running container.

See [docker/README.md](docker/README.md) for detailed Docker documentation.

## API Endpoints

### Authentication

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe"
}
```

#### Google OAuth Login
```http
GET /auth/google
```
Redirects to Google OAuth consent screen

#### Google OAuth Callback
```http
GET /auth/google/callback
```
Handled automatically by OAuth flow

#### Get Current User (Protected)
```http
GET /auth/me
Cookie: user_id=<session-id>
```

#### Logout (Protected)
```http
POST /auth/logout
Cookie: user_id=<session-id>
```

### Health Check
```http
GET /health
```

## Database Schema

### Users Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | VARCHAR(255) | Unique email |
| google_id | VARCHAR(255) | Google OAuth ID |
| name | VARCHAR(255) | User name |
| avatar_url | VARCHAR(500) | Profile picture URL |
| is_active | BOOLEAN | Account status |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

## Extending the Project

### Adding a New Feature

1. **Create Schema** - Add new table in `src/db/schemas/`
2. **Create Repository** - Implement data access in `src/repositories/`
3. **Create Service** - Add business logic in `src/services/`
4. **Create Routes** - Add API endpoints in `src/routes/`
5. **Register Routes** - Import and register in `src/app.ts`

### Example: Adding a Posts Feature

```typescript
// 1. src/db/schemas/posts.schema.ts
export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// 2. src/repositories/post.repository.ts
export class PostRepository extends BaseRepository {
  async findByUserId(userId: string): Promise<Post[]> {
    return this.db.select().from(posts).where(eq(posts.userId, userId));
  }
}

// 3. src/services/post.service.ts
export class PostService {
  constructor(private postRepository: PostRepository) {}

  async getUserPosts(userId: string): Promise<Post[]> {
    return this.postRepository.findByUserId(userId);
  }
}

// 4. src/routes/post.routes.ts
export async function postRoutes(fastify: FastifyInstance, postService: PostService) {
  fastify.get('/posts', { preHandler: requireAuth }, async (request) => {
    return postService.getUserPosts(request.userId!);
  });
}
```

## Path Aliases

The project uses `~` as an alias for the `src` directory:

```typescript
import { db } from '~/db/index.js';
import { UserRepository } from '~/repositories/index.js';
```

Configure this in your IDE for proper imports and navigation.

## Production Deployment

### Option 1: Docker Deployment (Recommended)

1. Update [.env.production](.env.production) with production credentials
2. Build and start containers:

```bash
npm run docker:prod:build
```

This will:
- Build the application Docker image
- Start PostgreSQL and the application
- Set up proper networking between services

### Option 2: Manual Deployment

1. Update [.env.production](.env.production) with production credentials
2. Build the project:

```bash
npm run build
```

3. Run migrations:

```bash
NODE_ENV=production npm run db:migrate
```

4. Start the server:

```bash
NODE_ENV=production npm start
```

### Environment Variables for Production

**Critical:** Update these in [.env.production](.env.production):

- `DATABASE_URL` - Production database connection string
- `POSTGRES_USER` - Production database user
- `POSTGRES_PASSWORD` - Strong database password
- `GOOGLE_CLIENT_ID` - Production Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Production Google OAuth secret
- `GOOGLE_CALLBACK_URL` - Production callback URL (e.g., `https://yourdomain.com/auth/google/callback`)
- `COOKIE_SECRET` - Strong random secret for cookies (minimum 32 characters)
- `APP_URL` - Production application URL

## Security Considerations

- Never commit `.env` files
- Use strong secrets in production
- Enable HTTPS in production
- Rotate OAuth credentials regularly
- Implement rate limiting for production
- Add input validation for all endpoints
- Use prepared statements (Drizzle handles this)

## License

ISC
