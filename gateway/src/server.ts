import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { RedisClient, RedisConfig } from './redis/RedisClient';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

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
  console.error('Redis error:', err);
  // Add alerting or fallback logic here for production
});

redisClient['client'].on('connect', () => {
  console.log('Redis connection established (gateway)');
});

// Security: Rate Limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
});
app.use(limiter);

app.use(express.json());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// JWT authentication middleware
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Proxy to user-service
app.use('/user', createProxyMiddleware({
  target: process.env.USER_SERVICE_URL || 'http://user-service:3001',
  changeOrigin: true,
  pathRewrite: { '^/user': '/' },
}));

// Proxy to order-service
app.use('/order', createProxyMiddleware({
  target: process.env.ORDER_SERVICE_URL || 'http://order-service:3002',
  changeOrigin: true,
  pathRewrite: { '^/order': '/' },
}));

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
