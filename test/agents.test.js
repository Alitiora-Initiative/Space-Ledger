'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { AGENT_REGISTRY } = require('../src/agents/index.js');

test('agent registry contains only the four configured display roles', () => {
  assert.deepEqual(Object.keys(AGENT_REGISTRY), ['001', '002', '003', '004']);
  assert.equal(AGENT_REGISTRY['001'].name, 'Gilga Prime');
  assert.equal(AGENT_REGISTRY['001'].parent, null);
  assert.equal(AGENT_REGISTRY['002'].parent, '001');
  assert.equal(AGENT_REGISTRY['003'].parent, '001');
  assert.equal(AGENT_REGISTRY['004'].parent, '001');
  assert.ok(Object.values(AGENT_REGISTRY).every(agent => agent.status === 'configured'));
});

test('agent registry and role records cannot be changed at runtime', () => {
  assert.equal(Object.isFrozen(AGENT_REGISTRY), true);
  assert.ok(Object.values(AGENT_REGISTRY).every(Object.isFrozen));
});
