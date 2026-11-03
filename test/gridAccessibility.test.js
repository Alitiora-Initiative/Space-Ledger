'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const gridPath = path.join(__dirname, '..', 'public', 'pages', 'grid.html');

test('grid provides a text alternative to the canvas for all 100 positions', () => {
  const html = fs.readFileSync(gridPath, 'utf8');

  assert.match(html, /<details id="accessiblePixelTextAlternative">/);
  assert.match(html, /<label for="accessiblePixelSelect">Pixel position<\/label>/);
  assert.match(html, /id="inspectAccessiblePixelBtn"/);
  assert.match(html, /<caption id="accessiblePixelCaption"[^>]*aria-live="polite"/);
  assert.match(html, /id="accessiblePixelRows"/);
  assert.match(html, /Individual pixel ownership is not implemented/);
  assert.match(html, /function updateAccessiblePixelList\(\)/);
  assert.match(html, /pixelIndex < 100/);
  assert.match(html, /option\.textContent = 'Pixel '/);
  assert.match(html, /cell\.textContent = value/);
  assert.match(html, /function selectPixel\(pixelIndex\)/);
  assert.match(html, /canvas\.addEventListener\('keydown'/);
  assert.match(html, /selectPixel\(row \* 10 \+ col\)/);
});

test('accessible grid status is derived from verified whole-block ownership only', () => {
  const html = fs.readFileSync(gridPath, 'utf8');

  assert.match(html, /currentOwnership\.verified\s*\?/);
  assert.match(html, /Whole block owned by /);
  assert.match(html, /Whole block unowned/);
  assert.match(html, /Ownership unverified/);
  assert.match(html, /block-level status applies to all 100 positions/);
  assert.doesNotMatch(html, /pixelOwners|pixelOwnershipMap|Math\.random\(\)/);
});
