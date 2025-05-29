
#!/bin/bash
# scripts/start-database.sh

echo "🚀 Down database environment..."

# Start base services
docker-compose \
  -f compose/docker-compose.database.yml \
  down

echo "✅ Down environment started!"