const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

test('shared sticky navigation stays above scrolling content', () => {
  const styles = fs.readFileSync(path.join(root, 'public', 'css', 'styles.css'), 'utf8');
  const navStart = styles.lastIndexOf('\nnav {');
  const navRule = styles.slice(navStart, styles.indexOf('}', navStart));
  assert.match(navRule, /position:\s*sticky !important/);
  assert.match(navRule, /z-index:\s*1000 !important/);
  assert.match(navRule, /background:\s*linear-gradient\([^;]*#050514[^;]*#0a0a23/);
  assert.match(navRule, /backdrop-filter:\s*none/);
});

test('shared footer stays fixed without covering page content', () => {
  const styles = fs.readFileSync(path.join(root, 'public', 'css', 'styles.css'), 'utf8');
  assert.match(styles, /\.site-footer\s*\{[^}]*position:\s*fixed !important/);
  assert.match(styles, /\.site-footer\s*\{[^}]*bottom:\s*0/);
  assert.match(styles, /body\s*\{[^}]*padding-bottom:\s*calc\(82px/);
  assert.match(styles, /\.site-footer nav\s*\{\s*position:\s*static !important/);
  assert.match(styles, /column-gap:\s*34px/);
});

test('Vercel applies security headers to static assets and functions', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  const wildcard = config.headers.find(rule => rule.source === '/(.*)');
  const headers = Object.fromEntries(wildcard.headers.map(({ key, value }) => [key.toLowerCase(), value]));
  assert.match(headers['content-security-policy'], /default-src 'self'/);
  assert.match(headers['content-security-policy'], /frame-ancestors 'none'/);
  assert.match(headers['content-security-policy'], /connect-src 'self' https:\/\/api\.devnet\.solana\.com wss:\/\/api\.devnet\.solana\.com/);
  assert.equal(headers['permissions-policy'], 'camera=(), geolocation=(), microphone=()');
  assert.equal(headers['referrer-policy'], 'strict-origin-when-cross-origin');
  assert.equal(headers['x-content-type-options'], 'nosniff');
  assert.equal(headers['x-frame-options'], 'DENY');
});

async function findFreePort() {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolve);
  });
  const { port } = probe.address();
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  return port;
}

async function waitForServer(baseUrl, child) {
  const deadline = Date.now() + 10_000;
  let lastError;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`App server exited with code ${child.exitCode}`);
    try {
      const response = await fetch(`${baseUrl}/api/supply`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`App server did not start: ${lastError?.message || 'timeout'} (${lastError?.cause?.message || 'no cause'})`);
}

test('Express app serves pages and live API endpoints while rejecting removed features', async t => {
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [path.join(root, 'src', 'index.js')], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'test',
      SOLANA_PROGRAM_ID: ''
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let childOutput = '';
  child.stdout.setEncoding('utf8').on('data', chunk => { childOutput += chunk; });
  child.stderr.setEncoding('utf8').on('data', chunk => { childOutput += chunk; });

  t.after(async () => {
    if (child.exitCode === null) {
      child.kill();
      await new Promise(resolve => child.once('exit', resolve));
    }
  });

  try {
    await waitForServer(baseUrl, child);
  } catch (error) {
    throw new Error(`${error.message}\n${childOutput}`);
  }

  const cases = [
    ['/', 'text/html'],
    ['/pages/purchase.html', 'text/html'],
    ['/pages/grid.html', 'text/html'],
    ['/pages/treasury.html', 'text/html'],
    ['/pages/network.html', 'text/html'],
    ['/pages/dashboard.html', 'text/html'],
    ['/pages/profile.html', 'text/html'],
    ['/pages/leaderboard.html', 'text/html'],
    ['/pages/market.html', 'text/html'],
    ['/pages/swap.html', 'text/html'],
    ['/pages/privacy.html', 'text/html'],
    ['/pages/terms.html', 'text/html'],
    ['/pages/cookies.html', 'text/html'],
    ['/api/price/0', 'application/json'],
    ['/api/price/range?start=0&count=2', 'application/json'],
    ['/api/supply', 'application/json'],
    ['/api/treasury', 'application/json'],
    ['/api/networks', 'application/json'],
    ['/api/grid?block=1', 'application/json'],
    ['/api/stats', 'application/json'],
    ['/api/market', 'application/json']
  ];

  const responses = new Map();
  for (const [route, contentType] of cases) {
    const response = await fetch(`${baseUrl}${route}`);
    assert.equal(response.status, 200, `${route} should return HTTP 200`);
    assert.match(response.headers.get('content-type') || '', new RegExp(contentType));
    assert.match(response.headers.get('content-security-policy') || '', /default-src 'self'/);
    assert.equal(response.headers.get('permissions-policy'), 'camera=(), geolocation=(), microphone=()');
    assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.equal(response.headers.has('x-powered-by'), false);
    responses.set(route, contentType === 'application/json' ? await response.json() : await response.text());
  }

  assert.match(responses.get('/'), /About Space Ledger/);
  assert.match(responses.get('/'), /<h1>Space Ledger<\/h1>/);
  assert.doesNotMatch(responses.get('/'), /Spatial Ledger Protocol/);
  assert.match(responses.get('/pages/privacy.html'), /Devnet test prototype — no real-world value/);
  assert.match(responses.get('/pages/terms.html'), /Terms of use \(Devnet prototype\)/);
  assert.match(responses.get('/pages/cookies.html'), /No advertising cookies/);
  assert.match(responses.get('/pages/leaderboard.html'), /confirmed Devnet purchase receipts/);
  assert.match(responses.get('/pages/market.html'), /Not a trading market/);
  assert.match(responses.get('/pages/profile.html'), /id="purchaseHistory" hidden/);
  assert.doesNotMatch(responses.get('/pages/grid.html'), /id="main-content"|id="minimap"|minimapCanvas/);
  assert.doesNotMatch(responses.get('/pages/network.html'), /id="main-content"/);
  assert.equal(responses.get('/api/price/0').price, 0.001);
  const labelResponse = await fetch(`${baseUrl}/api/price/000B`);
  assert.equal(labelResponse.status, 200);
  assert.equal((await labelResponse.json()).blockId, 1000);
  assert.equal((await fetch(`${baseUrl}/api/price/range?start=000A&count=2`)).status, 200);
  assert.equal(responses.get('/api/price/range?start=0&count=2').length, 2);
  assert.equal(responses.get('/api/supply').totalSupply, 10_000_000_000);
  assert.equal(responses.get('/api/supply').currentSupply, null);
  assert.equal(responses.get('/api/supply').status, 'not_deployed');
  assert.equal(responses.get('/api/grid?block=1').grid.length, 10);
  assert.equal(responses.get('/api/grid?block=1').blockLabel, '001A');
  const namedGridResponse = await fetch(`${baseUrl}/api/grid?block=000AA`);
  assert.equal(namedGridResponse.status, 200);
  const namedGrid = await namedGridResponse.json();
  assert.equal(namedGrid.blockId, 26_000);
  assert.equal(namedGrid.blockLabel, '000AA');
  assert.equal(responses.get('/api/market').verified, false);
  assert.deepEqual(responses.get('/api/market').latestReceipts, []);
  const paymentScript = fs.readFileSync(path.join(root, 'public', 'js', 'solanaPayment.js'), 'utf8');
  assert.ok(paymentScript.indexOf('simulateTransaction(transaction') < paymentScript.indexOf('signAndSendTransaction(transaction'));
  assert.match(paymentScript, /budget: activeQuote\.paymentUnits/);
  assert.match(paymentScript, /transactionData\.startBlock !== activeQuote\.startBlock/);
  const leaderboardResponse = await fetch(`${baseUrl}/api/leaderboard`);
  assert.equal(leaderboardResponse.status, 503);
  assert.equal((await leaderboardResponse.json()).verified, false);

  const ownerResponse = await fetch(`${baseUrl}/api/block-owner/0`);
  assert.equal(ownerResponse.status, 503);
  assert.equal((await ownerResponse.json()).error.includes('cannot be verified'), true);

  const purchaseResponse = await fetch(`${baseUrl}/api/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buyer: 'not-a-valid-wallet', asset: 'SOL', blockCount: 1, budget: '1000' })
    });
  assert.equal(purchaseResponse.status, 503, 'purchase preparation must refuse an unconfigured program');
  const retiredRoutes = ['/api/config', '/api/genesis', '/api/stream', '/api/vesting-status'];
  for (const route of retiredRoutes) assert.equal((await fetch(`${baseUrl}${route}`)).status, 404, `${route} must not expose stale placeholder data`);
  assert.equal((await fetch(`${baseUrl}/api/swap`, { method: 'POST' })).status, 404, 'unsupported swap endpoint must not pretend to exist');

  const writeRpcResponse = await fetch(`${baseUrl}/api/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ networkId: 1, method: 'eth_sendTransaction', params: [] })
  });
  assert.equal(writeRpcResponse.status, 400);
});

test('pages have image alternatives and do not load remote scripts or iframe embeds', () => {
  const pageDirectory = path.join(root, 'public', 'pages');
  const pages = [path.join(root, 'public', 'index.html'), ...fs.readdirSync(pageDirectory)
    .filter(file => file.endsWith('.html'))
    .map(file => path.join(pageDirectory, file))];
  for (const file of pages) {
    const html = fs.readFileSync(file, 'utf8');
    for (const match of html.matchAll(/<img\b([^>]*)>/gi)) {
      assert.match(match[1], /\balt\s*=/i, `${path.relative(root, file)} image must declare alt text`);
    }
    assert.doesNotMatch(html, /<iframe\b/i, `${path.relative(root, file)} must not embed third-party frames`);
    assert.doesNotMatch(html, /<script\b[^>]*\bsrc\s*=\s*["']https?:\/\//i, `${path.relative(root, file)} must not load remote scripts`);
  }
});
