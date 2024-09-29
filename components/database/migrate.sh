#!/bin/bash

set -e

# Variables (replace these with actual values or pass them via environment variables)
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-"postgres"}
DB_PASSWORD=${DB_PASSWORD:-"password"}
DB_NAME=${DB_NAME:-"mydatabase"}
MIGRATIONS_DIR=${MIGRATIONS_DIR:-"/migrations"}
SEED_FILE=${SEED_FILE:-"/seeds/seed.sql"}

# Construct the PostgreSQL URL
DB_URL="postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=disable"

function wait_for_db() {
  counter=0
  while ! pg_isready -h $DB_HOST -p $DB_PORT; do
    echo "Waiting for PostgreSQL to be ready on $DB_HOST:$DB_PORT"
    sleep 5
    counter=$((counter+1))
    if [ $counter -ge 24 ]; then  # 24 * 5 seconds = 2 minutes
      echo "Database connection timed out after 2 minutes."
      exit 1
    fi
  done
}

# Wait for the DB to be ready
wait_for_db

# Run migrations using golang-migrate
echo "Using DB URL: $DB_URL"
echo "Running database migrations..."
migrate -database "$DB_URL" -path "$MIGRATIONS_DIR" up || { echo "Migration failed"; exit 1; }
echo "Migrations completed."

# Apply seed data
echo "Seeding the database with initial data..."
psql "$DB_URL" -f "$SEED_FILE" || { echo "Seeding failed"; exit 1; }
echo "Seeding completed."

set +e

echo "Exiting with 0 code"
exit 0