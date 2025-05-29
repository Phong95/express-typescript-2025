
#!/bin/bash
# scripts/start-database.sh

echo "🚀 Starting database environment..."

# Start base services
docker-compose \
  -f compose/docker-compose.database.yml \
  up -d

echo "✅ database environment started!"