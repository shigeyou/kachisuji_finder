#!/bin/bash

# Create data directory
mkdir -p /home/data

# Copy initial database if not exists
if [ ! -f /home/data/kachisuji.db ]; then
    cp data/dev.db /home/data/kachisuji.db
    echo "Copied initial database"
fi

# Set database URL for the app
export DATABASE_URL="file:/home/data/kachisuji.db"

# Sync database schema (ignore errors)
npx prisma db push --schema=prisma/schema.prisma --skip-generate --accept-data-loss 2>&1 || echo "Schema sync skipped"

# Start the application
node server.js
