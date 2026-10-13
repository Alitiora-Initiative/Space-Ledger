(function () {
  const form = document.getElementById('devnetPurchaseForm');
  const status = document.getElementById('purchaseStatus');
  if (!form) return;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('amount') && form.elements.amount) form.elements.amount.value = params.get('amount');
    if (params.get('asset') && form.elements.asset) form.elements.asset.value = params.get('asset');
    if (params.get('from') === 'grid' && status) {
      status.textContent = 'Opened from the grid. Request a Devnet quote for this block, then approve in your wallet.';
    }
  } catch (_) {}
})();
