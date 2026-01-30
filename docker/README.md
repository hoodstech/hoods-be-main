# Docker Configuration

This directory contains Docker helper scripts and PostgreSQL initialization files.

## Structure

```
docker/
├── postgres/
│   └── init-user.sh         # PostgreSQL initialization script
├── docker-entrypoint.sh     # Container entrypoint (migrations & seed)
└── README.md                # This file
```

**Main Docker files are in project root:**
- `Dockerfile` - Multi-stage Dockerfile
- `docker-compose.development.yml` - Development environment
- `docker-compose.production.yml` - Production environment

## Files

- **docker-entrypoint.sh** - Entrypoint script for running migrations and seed
- **postgres/init-user.sh** - PostgreSQL initialization script

## Environment Variables Validation

**Important**: All Docker commands now automatically validate environment variables before starting containers. The validation script checks that all required variables are set in `.env.development` or `.env.production`.

If any variables are missing, you'll see:
```
❌ Error: The following required environment variables are missing or empty:
  - POSTGRES_USER
  - ADMIN_EMAIL
```

See [scripts/check-env.js](../scripts/check-env.js) for the validation logic.

### Initial Setup

**IMPORTANT**: Before running Docker for the first time, you must generate database migrations:

```bash
# Generate initial migrations
npm run db:generate
```

This creates the `src/db/migrations/` directory with the necessary migration files and metadata. These files are needed by the Docker container to set up the database schema.

## Development Environment

### Features

- **Hot Reload**: Source code changes are automatically reflected (via volume mounts)
- **Automatic Migrations**: Database migrations run on container startup
- **Automatic Seeding**: Admin user is created on first run
- **Redis**: In-memory cache for session management and authentication
- **pgAdmin**: Web-based database management interface at `http://localhost:5050`
- **Isolated Network**: App, database, and Redis communicate via Docker network
- **Health Checks**: PostgreSQL, Redis, and app containers have health checks
- **Environment Validation**: Required variables are checked before startup

### Starting Development Environment

```bash
# Start all services (postgres + app)
# Automatically validates .env.development first
npm run docker:dev

# View logs
docker-compose --env-file .env.development -f docker-compose.development.yml logs -f

# View app logs only
docker logs -f hoods-app-dev

# View database logs only
docker logs -f hoods-postgres-dev

# View pgAdmin logs only
docker logs -f hoods-pgadmin-dev

# View Redis logs only
docker logs -f hoods-redis-dev
```

### Accessing Services

- **Application**: http://localhost:3000
  - Health check: http://localhost:3000/v1/health
  - API docs: http://localhost:3000/docs
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **pgAdmin**: http://localhost:5050
  - Email: `admin@admin.com` (or value from `PGADMIN_EMAIL`)
  - Password: `admin` (or value from `PGADMIN_PASSWORD`)

#### Connecting to PostgreSQL in pgAdmin

After logging into pgAdmin:

1. Click "Add New Server"
2. **General Tab**:
   - Name: `Hoods Development`
3. **Connection Tab**:
   - Host: `postgres` (Docker service name)
   - Port: `5432`
   - Username: Value from `POSTGRES_USER` (default: `hoods_user`)
   - Password: Value from `POSTGRES_PASSWORD` (default: `hoods_pass`)
   - Database: Value from `POSTGRES_DB` (default: `hoods_db`)
4. Click "Save"

### Stopping Development Environment

```bash
# Stop all services
npm run docker:dev:down

# Stop and remove volumes (clean slate)
docker-compose --env-file .env.development -f docker-compose.development.yml down -v
```

### Development Workflow

1. Start services: `npm run docker:dev`
2. Wait for containers to be healthy
3. Edit code in `src/` directory
4. Changes are automatically detected and server restarts
5. Access API at http://localhost:3000
6. Access Swagger docs at http://localhost:3000/docs

### Volume Mounts

The following directories are mounted for hot reload:
- `src/` - Source code
- `package.json` - Dependencies
- `tsconfig.json` - TypeScript configuration

Node modules are in a named volume to avoid conflicts with host OS.

### Environment Variables

Development uses `.env.development` with the following overrides in docker-compose:
- `DATABASE_URL` - Points to `postgres` service instead of `localhost`
- `REDIS_HOST` - Points to `redis` service instead of `localhost`

**Important for local development without Docker:**
- Set `REDIS_HOST=localhost` in `.env.development` when running the app locally
- Set `REDIS_HOST=redis` when running in Docker (automatically set in docker-compose)

## Production Environment

### Features

- **Optimized Build**: Multi-stage build with minimal production image
- **Health Checks**: Application health monitoring
- **Auto Restart**: Containers restart on failure
- **Migrations & Seeding**: Automatic on startup
- **Non-root User**: App runs as unprivileged user

### Starting Production Environment

```bash
# Build and start all services
npm run docker:prod:build

# Or use pre-built images
npm run docker:prod
```

### Stopping Production Environment

```bash
npm run docker:prod:down
```

## Service Access

### PostgreSQL

#### From Host Machine

When containers are running, PostgreSQL is accessible at:
- Host: `localhost`
- Port: `5432` (or `POSTGRES_PORT` from .env)
- User: Value from `POSTGRES_USER`
- Password: Value from `POSTGRES_PASSWORD`
- Database: Value from `POSTGRES_DB`

#### From App Container

The app connects to PostgreSQL via Docker network:
- Host: `postgres` (service name)
- Port: `5432`
- Connection string is automatically set via `DATABASE_URL` environment variable

### Redis

#### From Host Machine

When containers are running, Redis is accessible at:
- Host: `localhost`
- Port: `6379` (or `REDIS_PORT` from .env)
- Password: Value from `REDIS_PASSWORD` (empty for development)
- Database: Value from `REDIS_DB` (default: 0)

Test connection:
```bash
# Using redis-cli (if installed locally)
redis-cli ping

# Using Docker
docker exec hoods-redis-dev redis-cli ping
```

#### From App Container

The app connects to Redis via Docker network:
- Host: `redis` (service name)
- Port: `6379`
- Configured via environment variables: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`

## Troubleshooting

### App container fails to start

1. Check if database is healthy:
   ```bash
   docker ps
   ```
   Look for "healthy" status on postgres container

2. Check app logs:
   ```bash
   docker logs hoods-app-dev
   ```

### Database connection errors

1. Verify DATABASE_URL in container:
   ```bash
   docker exec hoods-app-dev env | grep DATABASE_URL
   ```

2. Test database connection:
   ```bash
   docker exec hoods-postgres-dev psql -U hoods_user -d hoods_db -c "SELECT 1"
   ```

### Hot reload not working

1. Ensure volumes are mounted correctly:
   ```bash
   docker inspect hoods-app-dev | grep -A 10 Mounts
   ```

2. Restart the app container:
   ```bash
   docker restart hoods-app-dev
   ```

### Clean slate (remove all data)

```bash
# Stop and remove all containers, networks, and volumes
npm run docker:dev:down
docker volume rm hoods-be-main_postgres_data_dev
docker volume rm hoods-be-main_redis_data_dev
docker volume rm hoods-be-main_pgadmin_data_dev

# Rebuild and start
npm run docker:dev
```

## Health Checks

### PostgreSQL

```bash
curl http://localhost:5432  # Should connect
docker exec hoods-postgres-dev pg_isready -U hoods_user
```

### Redis

```bash
# Test Redis connection
docker exec hoods-redis-dev redis-cli ping  # Should return PONG

# Check Redis info
docker exec hoods-redis-dev redis-cli info server

# Monitor Redis commands in real-time
docker exec hoods-redis-dev redis-cli monitor
```

### Application

```bash
# General health check
curl http://localhost:3000/v1/health

# Should return: {"status":"ok","timestamp":"...","database":{"connected":true,"latency":...}}
```

## Network Architecture

```
┌─────────────────────────────────────────────────┐
│               Host Machine                      │
│  ┌──────────────────────────────────────────┐   │
│  │         Docker Network (dev_network)     │   │
│  │  ┌────────────────────────┐              │   │
│  │  │  hoods-postgres-dev    │              │   │
│  │  │  Port: 5432            │              │   │
│  │  └────────────────────────┘              │   │
│  │           ↑                               │   │
│  │           │ postgres:5432                 │   │
│  │  ┌────────────────────────┐              │   │
│  │  │  hoods-redis-dev       │              │   │
│  │  │  Port: 6379            │              │   │
│  │  └────────────────────────┘              │   │
│  │           ↑                               │   │
│  │           │ redis:6379                    │   │
│  │           ↓                               │   │
│  │  ┌────────────────────────┐              │   │
│  │  │  hoods-app-dev         │              │   │
│  │  │  Port: 3000            │              │   │
│  │  │  - Uses Redis for      │              │   │
│  │  │    sessions            │              │   │
│  │  │  - Connects to         │              │   │
│  │  │    PostgreSQL          │              │   │
│  │  └────────────────────────┘              │   │
│  │  ┌────────────────────────┐              │   │
│  │  │  hoods-pgadmin-dev     │              │   │
│  │  │  Port: 80              │              │   │
│  │  └────────────────────────┘              │   │
│  └──────────────────────────────────────────┘   │
│         ↓          ↓          ↓                  │
│    localhost:   localhost:  localhost:           │
│       3000         5432        6379               │
│                                                   │
│    pgAdmin at localhost:5050                     │
└─────────────────────────────────────────────────┘
```

### Services Communication

- **App → PostgreSQL**: Via `postgres:5432` (Docker network)
- **App → Redis**: Via `redis:6379` (Docker network)
- **pgAdmin → PostgreSQL**: Via `postgres:5432` (Docker network)
- **Host → App**: Via `localhost:3000`
- **Host → PostgreSQL**: Via `localhost:5432`
- **Host → Redis**: Via `localhost:6379`
- **Host → pgAdmin**: Via `localhost:5050`
