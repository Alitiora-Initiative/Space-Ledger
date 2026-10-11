const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function checkJavaScript(source, isModule, label) {
  const args = isModule ? ['--input-type=module', '--check'] : ['--check'];
  const result = spawnSync(process.execPath, args, { cwd: root, input: source, encoding: 'utf8' });
  assert.equal(result.status, 0, `${label}: ${result.stderr || result.stdout}`);
}

test('JavaScript source and inline page scripts parse without syntax errors', () => {
  for (const directory of ['src', 'public/js']) {
    for (const file of walk(path.join(root, directory)).filter(file => file.endsWith('.js'))) {
      const isModule = file.endsWith(`${path.sep}solanaPayment.js`);
      checkJavaScript(fs.readFileSync(file, 'utf8'), isModule, path.relative(root, file));
    }
  }

  for (const file of walk(path.join(root, 'public')).filter(file => file.endsWith('.html'))) {
    const html = fs.readFileSync(file, 'utf8');
    const scripts = html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi);
    let scriptIndex = 0;
    for (const [, attributes, source] of scripts) {
      if (/\bsrc\s*=/.test(attributes) || !source.trim()) continue;
      const isModule = /\btype\s*=\s*["']module["']/i.test(attributes);
      checkJavaScript(source, isModule, `${path.relative(root, file)} inline script ${++scriptIndex}`);
    }
  }
});
