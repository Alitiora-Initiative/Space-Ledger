'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const gridPath = path.join(__dirname, '..', 'public', 'pages', 'grid.html');

test('grid provides a text alternative to the canvas for all 100 positions', () => {
  const html = fs.readFileSync(gridPath, 'utf8');

  assert.match(html, /<details id="accessiblePixelTextAlternative"(?:\s|>)/);
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


test('grid reveals the voxel canvas only after its first renderer frame is ready', () => {
  const html = require('node:fs').readFileSync(gridPath, 'utf8');
  const shellStyles = html.slice(html.indexOf('.grid-world-shell{'), html.indexOf('#pixelCanvas:focus'));
  const mountStart = html.indexOf("window.SpaceLedgerGridEngine = window.SpaceLedgerWorld.mountGrid");
  const readyIndex = html.indexOf("shell.classList.add('is-ready')", mountStart);
  assert.match(shellStyles, /#pixelCanvas[^}]*opacity:0/);
  assert.match(shellStyles, /\.grid-world-shell:not\(\.is-ready\)::after/);
  assert.ok(mountStart >= 0 && readyIndex > mountStart, 'renderer must mount before the shell is revealed');
  assert.match(html, /WORLD SEQUENCE|SEQUENCE \\/ 8 VISUAL PHASES/);
});

test('grid zoom uses fit and two bounded enlargement levels', () => {
  const html = require('node:fs').readFileSync(gridPath, 'utf8');
  assert.match(html, /const allowed = \[1, 1\.5, 2\]/);
  assert.match(html, /Math\.min\(1600, Math\.round\(fitWidth \* currentZoom\)\)/);
  assert.match(html, /data-grid-zoom="1\.5"/);
  assert.match(html, /data-grid-zoom="2"/);
});

test('grid uses one pointer path for hover and touch without duplicating engine hover events', () => {
  const html = require('node:fs').readFileSync(gridPath, 'utf8');
  assert.match(html, /canvas\.addEventListener\('pointermove'/);
  assert.match(html, /window\.SpaceLedgerGridEngine\.setHover\(e\)/);
  assert.match(html, /e\.pointerType === 'touch'/);
  assert.doesNotMatch(html, /canvas\.addEventListener\('mousemove'/);
  assert.doesNotMatch(html, /canvas\.addEventListener\('pointermove',[\\s\\S]*?canvas\.addEventListener\('pointermove'/);
});
