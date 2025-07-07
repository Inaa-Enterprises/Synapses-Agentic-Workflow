# Redis Configuration and Usage Guide

## Overview
This document provides comprehensive documentation for the Redis integration in the ALI project, including configuration, deployment, and usage guidelines.

## Table of Contents
- [Configuration](#configuration)
- [Docker Deployment](#docker-deployment)
- [Integration](#integration)
- [Troubleshooting](#troubleshooting)
- [Security](#security)

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `REDIS_HOST` | Redis server hostname | `ali-redis` | Yes |
| `REDIS_PORT` | Redis server port | `6379` | Yes |
| `REDIS_PASSWORD` | Redis authentication password | - | Yes |
| `REDIS_DB` | Redis database number | `0` | No |
| `REDIS_TLS` | Enable TLS for Redis connection | `false` | No |

### Redis Configuration File

The Redis configuration file (`redis.conf`) is located at `backend/redis/redis.conf` and includes production-optimized settings for:

- Network and security settings
- Memory management
- Persistence (RDB snapshots)
- Replication (if enabled)
- Performance tuning

## Docker Deployment

Redis is deployed using Docker Compose with the following service definition:

```yaml
services:
  ali-redis:
    image: redis:7-alpine
    container_name: ali-redis
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "${REDIS_PORT:-6379}:6379"
    volumes:
      - redis_data:/data
      - ./backend/redis/redis.conf:/usr/local/etc/redis/redis.conf
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
```

### Volumes

- `redis_data`: Persistent volume for Redis data storage
- `redis.conf`: Custom Redis configuration file

## Integration

### Backend (NestJS)

The Redis client is initialized in `main.ts`:

```typescript
import { RedisClient } from './redis/RedisClient';

async function bootstrap() {
  // ... existing code ...
  
  // Initialize Redis client
  const redisClient = new RedisClient({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    enableReadyCheck: true,
    showFriendlyErrorStack: true,
  });

  // Make Redis client available throughout the application
  app.use((req, res, next) => {
    req.redis = redisClient;
    next();
  });
  
  // ... rest of the bootstrap code ...
}
```

### API Gateway

The Redis client is initialized in `server.ts`:

```typescript
import { RedisClient } from './redis/RedisClient';

// Initialize Redis client
const redisClient = new RedisClient({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  enableReadyCheck: true,
  showFriendlyErrorStack: true,
});

// Make Redis client available in request object
app.use((req, res, next) => {
  req.redis = redisClient;
  next();
});
```

## Usage Examples

### Basic Operations

```typescript
// Set a key-value pair
await redisClient.set('key', 'value');

// Get a value by key
const value = await redisClient.get('key');

// Set with TTL (Time To Live) in seconds
await redisClient.set('temp_key', 'data', 'EX', 3600);

// Delete a key
await redisClient.del('key');
```

### Caching Example

```typescript
async function getCachedData(key: string, fallback: () => Promise<any>, ttl = 3600) {
  const cached = await redisClient.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  
  const data = await fallback();
  await redisClient.set(key, JSON.stringify(data), 'EX', ttl);
  return data;
}
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Verify Redis container is running: `docker ps | grep redis`
   - Check Redis logs: `docker logs ali-redis`
   - Ensure correct host and port configuration

2. **Authentication Failed**
   - Verify `REDIS_PASSWORD` matches in `.env` and Docker Compose
   - Check for special characters in password that might need escaping

3. **Performance Issues**
   - Check Redis memory usage: `redis-cli info memory`
   - Monitor slow logs: `redis-cli slowlog get`

### Logs and Monitoring

View Redis logs:
```bash
docker logs ali-redis
```

Monitor Redis in real-time:
```bash
docker exec -it ali-redis redis-cli monitor
```

## Security

### Best Practices

1. **Authentication**
   - Always use a strong password
   - Rotate passwords regularly
   - Use TLS for production environments

2. **Network Security**
   - Bind Redis to internal Docker network only
   - Use firewall rules to restrict access
   - Enable TLS for encrypted connections

3. **Data Protection**
   - Use appropriate TTL for cached data
   - Implement proper error handling
   - Regularly back up persistent data

### Production Considerations

- Enable Redis persistence (AOF or RDB)
- Set appropriate memory limits
- Configure proper eviction policies
- Monitor Redis metrics
- Set up alerts for critical events

## Performance Tuning

### Memory Management

- Configure `maxmemory` in `redis.conf`
- Set appropriate `maxmemory-policy` (e.g., `allkeys-lru`)
- Monitor memory fragmentation ratio

### Connection Pooling

The Redis client is configured with connection pooling:
- Minimum connections: 5
- Maximum connections: 20
- Connection timeout: 30s
- Command timeout: 5s

## Maintenance

### Backup and Restore

Create a backup:
```bash
docker exec ali-redis redis-cli SAVE
# Then copy /data/dump.rdb from the container
```

Restore from backup:
```bash
# Copy dump.rdb to /data in the container
docker cp dump.rdb ali-redis:/data/
docker restart ali-redis
```

### Version Upgrades

1. Backup all data
2. Update the Redis image version in `docker-compose.redis.yml`
3. Test in staging environment
4. Deploy to production with zero-downtime strategy
