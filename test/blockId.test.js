'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const blockIds = require('../src/blockId');

test('block labels progress through letter groups and round trip', () => {
  const cases = [
    [0, '000A'],
    [999, '999A'],
    [1000, '000B'],
    [1999, '999B'],
    [2000, '000C'],
    [25_999, '999Z'],
    [26_000, '000AA'],
    [1_000_000_000, '000BDWGO'],
    [9_999_999_999, '999UVXWJ']
  ];

  for (const [number, label] of cases) {
    assert.equal(blockIds.format(number), label);
    assert.equal(blockIds.parse(label), number);
  }
  assert.equal(blockIds.parse('000aa'), 26_000);
  assert.equal(blockIds.parse('9999A'), null);
  assert.equal(blockIds.parse('000'), 0);
  assert.equal(blockIds.parse('10000000000'), null);
});

test('browser and API label codecs agree', () => {
  const window = {};
  const browserSource = fs.readFileSync(path.join(__dirname, '../public/js/block-id.js'), 'utf8');
  vm.runInNewContext(browserSource, { window, globalThis: window });
  for (const number of [0, 999, 1000, 25_999, 26_000, 1_000_000_000, 9_999_999_999]) {
    assert.equal(window.BlockId.format(number), blockIds.format(number));
    assert.equal(window.BlockId.parse(blockIds.format(number)), blockIds.parse(blockIds.format(number)));
  }
});
