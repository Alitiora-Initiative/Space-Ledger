'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createRateLimiter } = require('../src/rateLimit');

function mockReq(ip = '203.0.113.10') {
  return {
    headers: {},
    socket: { remoteAddress: ip },
    ip,
  };
}

function mockRes() {
  const headers = {};
  return {
    statusCode: 200,
    body: null,
    headers,
    set(name, value) {
      if (typeof name === 'object') Object.assign(headers, name);
      else headers[String(name).toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test('rate limiter allows requests under the max', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 3, name: 'quote' });
  const req = mockReq();
  for (let i = 0; i < 3; i++) {
    const res = mockRes();
    let nextCalled = false;
    limiter(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, 200);
  }
});

test('rate limiter returns 429 after the max within the window', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 2, name: 'purchase' });
  const req = mockReq('198.51.100.7');
  for (let i = 0; i < 2; i++) {
    const res = mockRes();
    limiter(req, res, () => {});
  }
  const blocked = mockRes();
  let nextCalled = false;
  limiter(req, blocked, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.headers['retry-after'] !== undefined || blocked.headers['Retry-After'] !== undefined, true);
  assert.match(blocked.body.error, /Too many purchase requests/i);
});

test('rate limiter isolates different client keys', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 1, name: 'quote' });
  const first = mockRes();
  limiter(mockReq('203.0.113.1'), first, () => {});
  const second = mockRes();
  let nextCalled = false;
  limiter(mockReq('203.0.113.2'), second, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(second.statusCode, 200);
});
