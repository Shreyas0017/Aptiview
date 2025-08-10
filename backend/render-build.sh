#!/bin/bash

# Render build script for production deployment

echo "Starting Render build process..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Validate DATABASE_URL early to avoid confusing runtime crashes
if [[ -z "${DATABASE_URL}" ]]; then
  echo "ERROR: DATABASE_URL is not set."
  echo "Please configure a Postgres connection string in Render -> Environment variables."
  echo "Example: postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require"
  echo "Or prisma+postgres://... for Prisma Accelerate"
  exit 1
fi

# Support standard Postgres URLs and Prisma Accelerate URLs
if [[ ${DATABASE_URL} =~ ^prisma\+postgres:// ]]; then
  echo "✅ Detected Prisma Accelerate URL"
elif [[ ${DATABASE_URL} =~ ^postgres:// ]] || [[ ${DATABASE_URL} =~ ^postgresql:// ]]; then
  echo "✅ Detected standard PostgreSQL URL"
else
  echo "ERROR: DATABASE_URL must start with postgres://, postgresql://, or prisma+postgres://"
  echo "Current value starts with: ${DATABASE_URL%%://*}:// (detected)"
  exit 1
fi

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Build TypeScript
echo "Building TypeScript..."
npm run build

echo "Build completed successfully!"
