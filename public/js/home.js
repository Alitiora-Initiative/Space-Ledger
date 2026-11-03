(() => {
  const available = document.getElementById('availableBlocks');
  const status = document.getElementById('saleStatusLabel');
  if (!available || !status) return;

  const setUnavailable = message => {
    available.textContent = 'Unavailable';
    status.textContent = message;
  };

  fetch('/api/supply', { headers: { Accept: 'application/json' } })
    .then(response => {
      if (!response.ok) throw new Error('The Devnet supply endpoint did not respond successfully.');
      return response.json();
    })
    .then(data => {
      if (data.status !== 'devnet_verified' || data.currentSupply == null) {
        available.textContent = '—';
        status.textContent = data.status === 'awaiting_initialization'
          ? 'The Devnet program is deployed but its ledger is not initialized yet.'
          : 'Verified on-chain supply is not currently available.';
        return;
      }

      if (!/^\d+$/.test(String(data.totalSupply)) || !/^\d+$/.test(String(data.currentSupply))) {
        throw new Error('The supply response is not a valid integer.');
      }

      const total = BigInt(data.totalSupply);
      const current = BigInt(data.currentSupply);
      if (total <= 0n || current < 0n || current > total) {
        throw new Error('The supply response is outside the published range.');
      }

      available.textContent = (total - current).toLocaleString();
      status.textContent = 'Current on-chain allocation: ' + current.toLocaleString() + ' of ' + total.toLocaleString() + ' blocks.';
    })
    .catch(() => setUnavailable('Live Devnet supply could not be verified. No estimated figure is displayed.'));
})();
