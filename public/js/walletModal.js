(() => {
  let dialog;
  let status;
  let connectButton;
  let installLink;
  let disconnectButton;

  function phantomProvider() {
    return window.phantom?.solana || (window.solana?.isPhantom ? window.solana : null);
  }

  function buildDialog() {
    if (dialog) return;
    dialog = document.createElement('dialog');
    dialog.className = 'wallet-dialog';
    dialog.setAttribute('aria-labelledby', 'wallet-dialog-title');
    dialog.setAttribute('aria-describedby', 'wallet-dialog-description');

    const panel = document.createElement('div');
    panel.className = 'wallet-dialog-panel';

    const heading = document.createElement('h2');
    heading.id = 'wallet-dialog-title';
    heading.textContent = 'Connect Phantom';

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'wallet-dialog-close';
    close.setAttribute('aria-label', 'Close wallet dialog');
    close.textContent = 'Close';
    close.addEventListener('click', () => dialog.close());

    const description = document.createElement('p');
    description.id = 'wallet-dialog-description';
    description.textContent = 'Phantom is the supported wallet for this Solana Devnet prototype. Your recovery phrase is never requested.';

    const connect = document.createElement('button');
    connect.type = 'button';
    connect.className = 'button wallet-dialog-action';
    connect.textContent = 'Connect Phantom';
    connect.addEventListener('click', connectPhantom);

    const install = document.createElement('a');
    install.className = 'button wallet-dialog-action';
    install.href = 'https://phantom.app/';
    install.target = '_blank';
    install.rel = 'noopener noreferrer';
    install.textContent = 'Open Phantom website';

    const disconnect = document.createElement('button');
    disconnect.type = 'button';
    disconnect.className = 'button wallet-dialog-action';
    disconnect.textContent = 'Disconnect wallet';
    disconnect.addEventListener('click', () => window.walletManager.disconnect());

    status = document.createElement('p');
    status.className = 'wallet-dialog-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    connectButton = connect;
    installLink = install;
    disconnectButton = disconnect;

    panel.append(close, heading, description, connect, install, disconnect, status);
    dialog.append(panel);
    dialog.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => {
      if (status) status.textContent = '';
    });
    document.body.append(dialog);
    renderState();
  }

  function renderState() {
    if (!dialog) return;
    const connected = window.walletManager?.isConnected();
    const detected = Boolean(phantomProvider());
    connectButton.hidden = !detected || connected;
    installLink.hidden = detected || connected;
    disconnectButton.hidden = !connected;
    if (connected) status.textContent = `Connected to ${window.walletManager.shortenAddress(window.walletManager.currentAddress)}.`;
  }

  async function connectPhantom() {
    connectButton.disabled = true;
    status.textContent = 'Waiting for Phantom approval.';
    try {
      await window.walletManager.connectPhantom();
      renderState();
      dialog.close();
    } catch (error) {
      status.textContent = error.message || 'Wallet connection was not completed.';
    } finally {
      connectButton.disabled = false;
    }
  }

  function updateNavButtons(address) {
    const shortAddress = window.walletManager.shortenAddress(address);
    document.querySelectorAll('.wallet-button, #navWalletBtn').forEach(button => {
      button.textContent = `Wallet · ${shortAddress}`;
      button.setAttribute('aria-label', `Connected wallet ${shortAddress}`);
      button.title = `Connected wallet ${shortAddress}`;
      button.setAttribute('data-wallet-connected', 'true');
    });
    renderState();
  }

  function clearNavButtons() {
    document.querySelectorAll('.wallet-button, #navWalletBtn').forEach(button => {
      button.textContent = 'Connect wallet';
      button.setAttribute('aria-label', 'Connect wallet');
      button.title = 'Connect wallet';
      button.removeAttribute('data-wallet-connected');
    });
    renderState();
  }

  function openModal() {
    buildDialog();
    renderState();
    if (!dialog.open) dialog.showModal();
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('.wallet-button, #navWalletBtn');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openModal();
  }, true);

  window.walletManager?.on('connected', ({ address }) => updateNavButtons(address));
  window.walletManager?.on('disconnected', clearNavButtons);
  window.openWalletModal = openModal;
  window.closeWalletModal = () => dialog?.close();
})();
