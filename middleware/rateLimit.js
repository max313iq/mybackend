const rateLimit = require('express-rate-limit');

const WINDOW_MINUTES = process.env.RATE_LIMIT_WINDOW_MINUTES || 15;
const MAX_REQUESTS = process.env.RATE_LIMIT_MAX || (process.env.NODE_ENV === 'development' ? 1000 : 100);

exports.apiLimiter = rateLimit({
  windowMs: WINDOW_MINUTES * 60 * 1000,
  max: MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later.'
});
