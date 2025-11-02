# Quick Start Guide

[Русская версия](./QUICKSTART.ru.md)

Get your development environment up and running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- Docker Desktop installed (for easy database setup)
- Google OAuth credentials (optional for testing)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Setup Environment

Copy the development environment file:

```bash
cp .env.development .env
```

If you want to test Google OAuth, update your [.env](.env.development) file with your Google credentials. Otherwise, you can skip this step and test other endpoints.

## Step 3: Generate Migrations

**IMPORTANT**: Generate database migrations before starting Docker:

```bash
npm run db:generate
```

This creates the migration files that Docker will use to set up the database schema.

## Step 4: Start Docker Stack

Start both PostgreSQL and the application in Docker:

```bash
npm run docker:dev
```

This will:
- Start PostgreSQL container
- Start application container
- Start pgAdmin container (database management UI)
- Run migrations automatically
- Create admin user from .env credentials
- Enable hot reload for development

The services will be available at:
- **Application**: `http://localhost:3000`
- **pgAdmin**: `http://localhost:5050` (login: admin@admin.com / admin)

## Alternative: Local Development (without Docker)

If you prefer to run the app locally and only use Docker for PostgreSQL:

```bash
# Start only PostgreSQL
docker-compose --env-file .env.development -f docker-compose.development.yml up postgres -d

# Run migrations
npm run db:migrate

# Seed admin user
npm run db:seed

# Start development server
npm run dev
```

## Test Your Setup

### Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Register a User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "test@example.com",
    "name": "Test User"
  }
}
```

### Google OAuth

Visit in your browser:
```
http://localhost:3000/auth/google
```

This will redirect you to Google's OAuth consent screen (if credentials are configured).

## Next Steps

- Read the [README.md](./README.md) for full documentation
- Check [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the project structure
- Explore [src/](./src/) directory to see the code organization

## Common Issues

### Port Already in Use

If port 3000 is already in use, change the `PORT` in your `.env` file:

```env
PORT=3001
```

### Database Connection Failed

Make sure Docker is running and PostgreSQL container is up:

```bash
docker ps
```

You should see `hoods-postgres-dev` in the list.

To restart the database:

```bash
npm run docker:dev:down
npm run docker:dev
```

### Migration Errors

If migrations fail, make sure the database is running and accessible. You can check the connection by running:

```bash
docker exec -it hoods-postgres-dev psql -U postgres -d hoods_db
```

## Development Workflow

1. Make changes to the code
2. The server auto-reloads (thanks to `tsx watch`)
3. Test your changes
4. Commit your code

### Adding a New Database Table

1. Create schema in `src/db/schemas/`
2. Generate migration: `npm run db:generate`
3. Apply migration: `npm run db:migrate`
4. Create repository, service, and routes as needed

### Viewing Database

Use Drizzle Studio to visually browse your database:

```bash
npm run db:studio
```

This opens a web interface at `https://local.drizzle.studio`

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run lint            # Check code style
npm run lint:fix        # Fix code style issues

# Database
npm run db:generate     # Generate migration files
npm run db:migrate      # Run migrations
npm run db:studio       # Open database GUI

# Docker
npm run docker:dev      # Start PostgreSQL
npm run docker:dev:down # Stop PostgreSQL
```

## Getting Help

- Check [README.md](./README.md) for detailed documentation
- Review [ARCHITECTURE.md](./ARCHITECTURE.md) for architectural patterns
- Look at existing code in [src/](./src/) for examples

Happy coding!
