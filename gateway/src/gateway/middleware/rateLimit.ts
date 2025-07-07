import rateLimit from 'express-rate-limit';

export const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false
});
