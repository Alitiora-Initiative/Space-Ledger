const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

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
      const response = await fetch(`${baseUrl}/api/config`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`App server did not start: ${lastError?.message || 'timeout'} (${lastError?.cause?.message || 'no cause'})`);
}

test('Express app serves its pages and read-only API endpoints', async t => {
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [path.join(root, 'src', 'index.js')], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'test',
      SUPABASE_URL: '',
      SUPABASE_SERVICE_KEY: '',
      FEE_WALLET_ADDRESS: ''
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
    ['/pages/swap.html', 'text/html'],
    ['/api/config', 'application/json'],
    ['/api/price/0', 'application/json'],
    ['/api/price/range?start=0&count=2', 'application/json'],
    ['/api/supply', 'application/json'],
    ['/api/treasury', 'application/json'],
    ['/api/vesting-status', 'application/json'],
    ['/api/networks', 'application/json'],
    ['/api/grid?block=1', 'application/json'],
    ['/api/genesis', 'application/json'],
    ['/api/stats', 'application/json']
  ];

  const responses = new Map();
  for (const [route, contentType] of cases) {
    const response = await fetch(`${baseUrl}${route}`);
    assert.equal(response.status, 200, `${route} should return HTTP 200`);
    assert.match(response.headers.get('content-type') || '', new RegExp(contentType));
    responses.set(route, contentType === 'application/json' ? await response.json() : await response.text());
  }

  assert.match(responses.get('/'), /About Space Ledger/);
  assert.equal(responses.get('/api/config').totalBlocks, 10_000_000_000);
  assert.equal(responses.get('/api/price/0').price, 0.001);
  assert.equal(responses.get('/api/price/range?start=0&count=2').length, 2);
  assert.equal(responses.get('/api/supply').totalSupply, 10_000_000_000);
  assert.equal(responses.get('/api/supply').currentSupply, null);
  assert.equal(responses.get('/api/supply').status, 'not_deployed');
  assert.equal(responses.get('/api/grid?block=1').grid.length, 10);
  assert.equal(responses.get('/api/genesis').verified, false);

  const ownerResponse = await fetch(`${baseUrl}/api/block-owner/0`);
  assert.equal(ownerResponse.status, 503);
  assert.equal((await ownerResponse.json()).error.includes('cannot be verified'), true);

  for (const route of ['/api/purchase', '/api/swap']) {
    const response = await fetch(`${baseUrl}${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: 'wallet', blockId: 1, blockCount: 1, txSignature: 'fake' })
    });
    assert.equal(response.status, 503, `${route} must refuse unverified transactions`);
  }

  const writeRpcResponse = await fetch(`${baseUrl}/api/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ networkId: 1, method: 'eth_sendTransaction', params: [] })
  });
  assert.equal(writeRpcResponse.status, 400);
});
