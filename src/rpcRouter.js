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

async function routeRequest(networkId, method, params = []) {
  const network = networkConfig[networkId];
  
  if (!network) {
    throw new Error(`Network ID ${networkId} not supported`);
  }
  
  try {
    const response = await fetch(network.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: params
      })
    });
    
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

function addNetwork(networkId, name, rpcUrl, chainId) {
  networkConfig[networkId] = {
    name,
    rpcUrl,
    chainId
  };
}

function removeNetwork(networkId) {
  delete networkConfig[networkId];
}

module.exports = {
  routeRequest,
  getNetworks,
  addNetwork,
  removeNetwork
};
