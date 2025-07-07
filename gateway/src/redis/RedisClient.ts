// redis/RedisClient.ts - Redis utility class for all services
import Redis from 'ioredis';
import { promisify } from 'util';

export interface RedisConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
  lazyConnect?: boolean;
}

export class RedisClient {
  private client: Redis;
  private isConnected: boolean = false;
  private keyPrefix: string;

  constructor(config: RedisConfig = {}) {
    this.keyPrefix = config.keyPrefix || '';
    
    // Parse Redis URL if provided
    if (config.url) {
      this.client = new Redis(config.url, {
        retryDelayOnFailover: config.retryDelayOnFailover || 100,
        maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
        lazyConnect: config.lazyConnect || true,
      });
    } else {
      this.client = new Redis({
        host: config.host || 'localhost',
        port: config.port || 6379,
        password: config.password,
        db: config.db || 0,
        retryDelayOnFailover: config.retryDelayOnFailover || 100,
        maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
        lazyConnect: config.lazyConnect || true,
      });
    }
  }
  // ... (rest of the implementation, will move more if needed)
