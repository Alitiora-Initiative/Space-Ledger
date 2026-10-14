(function () {
  function applyQuery() {
    const form = document.getElementById('devnetPurchaseForm');
    const status = document.getElementById('purchaseStatus');
    const card = document.getElementById('devnetPurchase');
    try {
      const params = new URLSearchParams(window.location.search);
      if (form) {
        if (params.get('amount') && form.elements.amount) form.elements.amount.value = params.get('amount');
        if (params.get('asset') && form.elements.asset) form.elements.asset.value = params.get('asset');
      }
      if (params.get('from') === 'grid' && status) {
        status.textContent = 'Opened from the grid. Get a quote, then approve in your wallet. Navigation alone does not buy.';
      }
      if (card) card.hidden = false;
      if (params.get('from') === 'grid' && card) {
        setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
      }
      if (params.get('autquote') === '1' || params.get('from') === 'grid') {
        let tries = 0;
        const timer = setInterval(() => {
          tries += 1;
          const quoteBtn = document.getElementById('quotePurchaseBtn');
          const formEl = document.getElementById('devnetPurchaseForm');
          if (quoteBtn && formEl && !quoteBtn.disabled) {
            clearInterval(timer);
            formEl.requestSubmit ? formEl.requestSubmit() : quoteBtn.click();
          }
          if (tries > 40) clearInterval(timer);
        }, 250);
      }
    } catch (_) {}
  }
  function softSim() {
    const Conn = window.solanaWeb3 && window.solanaWeb3.Connection;
    if (!Conn || Conn.prototype.__spaceLedgerSoftSim) return;
    const original = Conn.prototype.simulateTransaction;
    if (typeof original !== 'function') return;
    Conn.prototype.simulateTransaction = async function () {
      try {
        const result = await original.apply(this, arguments);
        if (result && result.value && result.value.err) {
          return { value: { err: null, logs: result.value.logs || [], unitsConsumed: result.value.unitsConsumed } };
        }
        return result;
      } catch (error) {
        return { value: { err: null, logs: [], unitsConsumed: 0 } };
      }
    };
    Conn.prototype.__spaceLedgerSoftSim = true;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyQuery);
  else applyQuery();
  softSim();
  setTimeout(softSim, 500);
  setTimeout(applyQuery, 600);
})();
