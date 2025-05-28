
#!/bin/bash
# scripts/start-redis.sh

echo "🚀 Down redis environment..."

# Start base services
docker-compose \
  -f compose/docker-compose.redis.yml \
  down

echo "✅ Down environment started!"