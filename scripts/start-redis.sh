
#!/bin/bash
# scripts/start-redis.sh

echo "🚀 Starting redis environment..."

# Start base services
docker-compose \
  -f compose/docker-compose.redis.yml \
  up -d

echo "✅ Redis environment started!"