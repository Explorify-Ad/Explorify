#!/bin/bash

# ===========================================
# Explorify - Database Seeding Script
# ===========================================

set -e

echo "Explorify Database Seeding"
echo "================================"

# Check for DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  if [ -f .env ]; then
    export $(grep DATABASE_URL .env | xargs)
  fi
fi

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set. Please set it in your .env file."
  exit 1
fi

echo "Running database migrations..."

# Run migrations in order
for migration in database/migrations/*.sql; do
  echo "  Running: $migration"
  psql "$DATABASE_URL" -f "$migration"
done

echo "Migrations complete"

echo ""
echo "Seeding database..."

# Run seed files
for seed in database/seeds/*.sql; do
  echo "  Seeding: $seed"
  psql "$DATABASE_URL" -f "$seed"
done

echo "Seeding complete"
echo ""
echo "Database is ready!"
