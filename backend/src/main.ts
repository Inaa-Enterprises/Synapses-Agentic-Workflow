import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';
import { ValidationPipe } from '@nestjs/common';
import { RedisClient, RedisConfig } from '../redis/RedisClient';

async function bootstrap() {
  // Production-grade Redis configuration
  const redisConfig: RedisConfig = {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : 0,
    keyPrefix: process.env.REDIS_KEY_PREFIX || '',
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 5,
    lazyConnect: false,
  };

  // Initialize Redis client with error handling and connection monitoring
  const redisClient = new RedisClient(redisConfig);

  redisClient['client'].on('error', (err: any) => {
    console.error('Redis error (backend):', err);
    // Add alerting or fallback logic here for production
  });

  redisClient['client'].on('connect', () => {
    console.log('Redis connection established (backend)');
  });

  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.setGlobalPrefix('api');
  await app.listen(8080);
  console.log('ALI backend running on port 8080');
}

bootstrap();
