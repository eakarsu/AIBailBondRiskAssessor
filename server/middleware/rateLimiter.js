const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

/**
 * AI endpoint rate limiter: 20 requests per user per hour.
 * Uses authenticated user ID when available, falls back to IP.
 */
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: (req) => req.user?.id ? `user_${req.user.id}` : ipKeyGenerator(req),
  message: {
    error: 'Too many AI requests. Limit is 20 per hour. Please try again later.',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API rate limiter: 100 requests per IP per 15 minutes.
 */
const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { aiRateLimiter, generalRateLimiter };
