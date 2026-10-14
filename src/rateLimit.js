'use strict';

/**
 * Lightweight in-memory sliding-window rate limiter.
 * Best-effort on serverless (per-instance); still useful for Devnet beta.
 */

function createRateLimiter({ windowMs, max, name }) {
  const hits = new Map();

  function prune(now) {
    for (const [key, timestamps] of hits) {
      const fresh = timestamps.filter(t => now - t < windowMs);
      if (fresh.length === 0) hits.delete(key);
      else hits.set(key, fresh);
    }
  }

  function clientKey(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0].trim();
    }
    return req.socket?.remoteAddress || req.ip || 'unknown';
  }

  return function rateLimitMiddleware(req, res, next) {
    const now = Date.now();
    if (hits.size > 10_000) prune(now);

    const key = `${name}:${clientKey(req)}`;
    const timestamps = (hits.get(key) || []).filter(t => now - t < windowMs);

    if (timestamps.length >= max) {
      const retryAfterSec = Math.max(1, Math.ceil((timestamps[0] + windowMs - now) / 1000));
      res.set('Retry-After', String(retryAfterSec));
      res.set('X-RateLimit-Limit', String(max));
      res.set('X-RateLimit-Remaining', '0');
      return res.status(429).json({
        error: `Too many ${name} requests. Try again in ${retryAfterSec} second(s).`,
        retryAfterSeconds: retryAfterSec,
      });
    }

    timestamps.push(now);
    hits.set(key, timestamps);
    res.set('X-RateLimit-Limit', String(max));
    res.set('X-RateLimit-Remaining', String(Math.max(0, max - timestamps.length)));
    next();
  };
}

module.exports = { createRateLimiter };
