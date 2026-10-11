// Multi-chain RPC routing architecture
// Routes requests to appropriate blockchain networks based on network ID

const networkConfig = {
  1: {
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://eth.llamarpc.com',
    chainId: 1
  },
  8453: {
    name: 'Base Mainnet',
    rpcUrl: 'https://mainnet.base.org',
    chainId: 8453
  },
  84532: {
    name: 'Base Sepolia Testnet',
    rpcUrl: 'https://sepolia.base.org',
    chainId: 84532
  },
  137: {
    name: 'Polygon Mainnet',
    rpcUrl: 'https://polygon.llamarpc.com',
    chainId: 137
  },
  10: {
    name: 'Optimism Mainnet',
    rpcUrl: 'https://optimism.llamarpc.com',
    chainId: 10
  },
  42161: {
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    chainId: 42161
  }
};
const READ_ONLY_METHODS = new Set([
  'eth_blockNumber', 'eth_chainId', 'eth_getBalance', 'eth_getBlockByNumber',
  'eth_getBlockByHash', 'eth_getTransactionByHash', 'eth_getTransactionReceipt',
  'eth_gasPrice', 'eth_estimateGas', 'eth_call', 'net_version'
]);

async function routeRequest(networkId, method, params = []) {
  const network = networkConfig[Number(networkId)];
  
  if (!network) {
    throw new Error(`Network ID ${networkId} not supported`);
  }
  if (typeof method !== 'string' || !READ_ONLY_METHODS.has(method)) {
    throw new Error('Only allowlisted, read-only EVM RPC methods are supported.');
  }
  if (!Array.isArray(params) || params.length > 8) {
    throw new Error('RPC params must be an array containing no more than 8 items.');
  }
  
  try {
    const response = await fetch(network.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: params
      })
    });
    
    if (!response.ok) throw new Error(`RPC endpoint returned HTTP ${response.status}`);
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    return {
      success: true,
      network: network.name,
      networkId,
      method,
      result: data.result
    };
  } catch (error) {
    throw new Error(`RPC request failed: ${error.message}`);
  }
}

function getNetworks() {
  return Object.entries(networkConfig).map(([id, config]) => ({
    id: parseInt(id),
    name: config.name,
    chainId: config.chainId,
    rpcUrl: config.rpcUrl
  }));
}

module.exports = {
  routeRequest,
  getNetworks
};
