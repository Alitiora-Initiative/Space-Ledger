const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', 'public', file), 'utf8');
const html = read('index.html');
const css = read('css/home.css');
const js = read('js/home.js');

test('homepage has one clear primary canvas action and a concise route into the app', () => {
  assert.match(html, /A shared canvas\./);
  assert.match(html, /href="\/pages\/grid\.html"[^>]*>Explore the canvas/);
  assert.match(html, /id="how-it-works"/);
  assert.doesNotMatch(html, /Quick Actions|How to test \(Discord \/ free tier\)/);
});

 test('homepage keeps the Devnet canvas disclosure', () => {
   const html = read('index.html');
   assert.match(html, /Devnet/);
   assert.doesNotMatch(html, /\$SL|token\.html/i);
 });

test('homepage clearly marks features that are not implemented and audit status', () => {
  assert.match(html, /Not implemented/);
  assert.match(html, /Pixel-level ownership and resale/);
  assert.match(html, /has not completed an independent security audit/i);
});

test('live supply is displayed only after a verified API response', () => {
  assert.match(html, /id="availableBlocks"/);
  assert.match(html, /id="saleStatusLabel"/);
  assert.match(js, /data\.status !== 'devnet_verified'/);
  assert.match(js, /BigInt\(data\.currentSupply\)/);
  assert.match(js, /No estimated figure is displayed/);
});

test('homepage illustration and responsive layout have accessible fallbacks', () => {
  assert.match(html, /space-ledger-orbit\.svg/);
  assert.match(html, /alt="A luminous, tilted pixel grid/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(max-width: 680px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});
