#!/bin/sh
set -e

echo "🚀 Starting application entrypoint..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
until nc -z postgres 5432; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done
echo "✅ PostgreSQL is up"

# Run migrations
echo "🔄 Running database migrations..."
npm run db:migrate

# Run seed (create admin user)
echo "🌱 Running database seed (admin user)..."
npm run db:seed

# Start the application
echo "🚀 Starting application..."
exec npm run dev
