(function () {
  function patch() {
    const m = window.walletManager;
    if (!m || m.__reconnectPatched) return false;
    m.__reconnectPatched = true;
    const key = 'spaceLedger.lastWallet';
    const origConnect = m.connect.bind(m);
    m.connect = async function (wallet) {
      const result = await origConnect(wallet);
      try { sessionStorage.setItem(key, result.wallet || ''); } catch (_) {}
      return result;
    };
    const origDisconnect = m.disconnect.bind(m);
    m.disconnect = async function (notifyWallet = true) {
      if (notifyWallet) {
        try { sessionStorage.removeItem(key); } catch (_) {}
      }
      return origDisconnect(notifyWallet);
    };
    setTimeout(async () => {
      if (m.isConnected()) return;
      let name = '';
      try { name = sessionStorage.getItem(key) || ''; } catch (_) {}
      if (!name) return;
      const wallet = m.getAvailableWallets().find(w => w.name === name);
      if (!wallet) return;
      try { await m.connect(wallet); } catch (_) {}
    }, 500);
    setTimeout(async () => {
      if (m.isConnected()) return;
      let name = '';
      try { name = sessionStorage.getItem(key) || ''; } catch (_) {}
      const wallet = m.getAvailableWallets().find(w => w.name === name);
      if (wallet) try { await m.connect(wallet); } catch (_) {}
    }, 1500);
    return true;
  }
  if (!patch()) {
    document.addEventListener('DOMContentLoaded', patch);
    setTimeout(patch, 300);
  }
})();
