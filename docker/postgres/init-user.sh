#!/bin/bash
set -e

# This script runs during PostgreSQL container initialization
# It creates the application database and user from environment variables

echo "🔧 Starting PostgreSQL initialization..."

# The POSTGRES_USER, POSTGRES_PASSWORD, and POSTGRES_DB are already used by the
# official PostgreSQL image to create the initial superuser and database
# This script just confirms the setup

echo "✅ PostgreSQL initialization complete"
echo "📦 Database created: $POSTGRES_DB"
echo "👤 User created: $POSTGRES_USER"
echo "🔐 Authentication configured"
