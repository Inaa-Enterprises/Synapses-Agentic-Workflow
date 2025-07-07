import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authMiddleware } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { routingConfig } from './config/routes';
import healthRouter from './routes/health';

const app = express();

// Middleware stack
app.use(express.json());
app.use(rateLimitMiddleware);
app.use(authMiddleware);

// Health check endpoint
app.use('/health', healthRouter);

// Dynamic route registration
routingConfig.forEach(route => {
  app.use(route.path, createProxyMiddleware(route.config));
});

export default app;
