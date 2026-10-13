(() => {
  const KNOWN = [
    ['Phantom', 'https://phantom.app/download'],
    ['Solflare', 'https://solflare.com/download'],
    ['Backpack', 'https://backpack.app/download'],
    ['Glow', 'https://glow.app/'],
    ['Trust Wallet', 'https://trustwallet.com/download'],
  ];
  let dialog, status, walletList, disconnectButton;

  function buildDialog() {
    if (dialog) return;
    dialog = document.createElement('dialog');
    dialog.className = 'wallet-dialog';
    dialog.setAttribute('aria-labelledby', 'wallet-dialog-title');
    const panel = document.createElement('div');
    panel.className = 'wallet-dialog-panel';
    const heading = document.createElement('h2');
    heading.id = 'wallet-dialog-title';
    heading.textContent = 'Connect a Solana wallet';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'wallet-dialog-close';
    close.textContent = 'Cancel';
    close.addEventListener('click', () => dialog.close());
    const description = document.createElement('p');
    description.textContent = 'Choose any detected Solana wallet. Use Devnet for this site. Your seed phrase is never requested.';
    walletList = document.createElement('div');
    walletList.className = 'wallet-dialog-list';
    disconnectButton = document.createElement('button');
    disconnectButton.type = 'button';
    disconnectButton.className = 'button wallet-dialog-action';
    disconnectButton.textContent = 'Disconnect';
    disconnectButton.addEventListener('click', async () => {
      await window.walletManager.disconnect();
      renderState();
    });
    status = document.createElement('p');
    status.className = 'wallet-dialog-status';
    status.setAttribute('role', 'status');
    panel.append(close, heading, description, walletList, disconnectButton, status);
    dialog.append(panel);
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    document.body.append(dialog);
    renderState();
  }

  function renderState() {
    if (!dialog || !window.walletManager) return;
    const manager = window.walletManager;
    const connected = manager.isConnected();
    const wallets = manager.getAvailableWallets();
    const info = manager.getWalletInfo();
    walletList.replaceChildren();
    disconnectButton.hidden = !connected;

    wallets.forEach(wallet => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'button wallet-dialog-action';
      button.textContent = connected && info.wallet === wallet.name
        ? 'Connected · ' + wallet.name
        : 'Connect ' + wallet.name;
      button.disabled = connected && info.wallet === wallet.name;
      button.addEventListener('click', async () => {
        status.textContent = 'Connecting to ' + wallet.name + '… Confirm in the extension if asked.';
        button.disabled = true;
        try {
          const result = await manager.connect(wallet);
          status.textContent = 'Connected: ' + result.wallet + ' (' + manager.shortenAddress(result.address) + ')';
          updateNavButtons({ wallet: result.wallet, address: result.address });
          setTimeout(() => dialog.close(), 500);
        } catch (error) {
          status.textContent = error.message || 'Connection failed.';
          button.disabled = false;
        }
      });
      walletList.append(button);
    });

    const names = wallets.map(w => String(w.name).toLowerCase());
    const missing = KNOWN.filter(([name]) => !names.some(n => n.includes(name.toLowerCase().split(' ')[0])));
    if (missing.length) {
      const empty = document.createElement('div');
      empty.className = 'wallet-dialog-empty';
      empty.innerHTML = (wallets.length ? '<p>Also install:</p>' : '<p>No wallet detected. Install one, unlock it, refresh:</p>');
      missing.forEach(([name, url]) => {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'button wallet-dialog-action';
        a.style.display = 'inline-block';
        a.style.marginTop = '8px';
        a.style.marginRight = '8px';
        a.textContent = 'Get ' + name;
        empty.append(a);
      });
      walletList.append(empty);
    }

    if (connected) status.textContent = status.textContent || ('Connected: ' + info.wallet);
    else if (!wallets.length) status.textContent = 'Install a Solana wallet extension, then reopen this dialog.';
  }

  function updateNavButtons(payload) {
    const address = payload?.address || window.walletManager?.getWalletInfo()?.address;
    const wallet = payload?.wallet || window.walletManager?.getWalletInfo()?.wallet;
    if (!address) return;
    const shortAddress = window.walletManager.shortenAddress(address);
    document.querySelectorAll('.wallet-button, #navWalletBtn').forEach(button => {
      button.textContent = shortAddress;
      button.setAttribute('aria-label', 'Connected: ' + address);
      button.title = (wallet || 'Wallet') + ': ' + address;
      button.setAttribute('data-wallet-connected', 'true');
    });
    renderState();
  }

  function clearNavButtons() {
    document.querySelectorAll('.wallet-button, #navWalletBtn').forEach(button => {
      button.textContent = 'Connect Wallet';
      button.setAttribute('aria-label', 'Connect Solana wallet');
      button.title = 'Connect Solana wallet';
      button.removeAttribute('data-wallet-connected');
    });
    renderState();
  }

  function openModal() {
    buildDialog();
    renderState();
    try {
      if (!dialog.open) dialog.showModal();
    } catch (_) {
      dialog.setAttribute('open', '');
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('.wallet-button, #navWalletBtn');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openModal();
  }, true);

  window.walletManager?.on('walletsChanged', renderState);
  window.walletManager?.on('connected', updateNavButtons);
  window.walletManager?.on('disconnected', clearNavButtons);
  window.openWalletModal = openModal;
  window.closeWalletModal = () => dialog?.close();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildDialog);
  } else {
    buildDialog();
  }
})();
