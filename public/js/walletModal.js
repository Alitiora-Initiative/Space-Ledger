(() => {
  let dialog;
  let status;
  let walletList;
  let disconnectButton;

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
    heading.textContent = 'Connect a Solana wallet';

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'wallet-dialog-close';
    close.setAttribute('aria-label', 'Close wallet dialog');
    close.textContent = 'Close';
    close.addEventListener('click', () => dialog.close());

    const description = document.createElement('p');
    description.id = 'wallet-dialog-description';
    description.textContent = 'Choose a detected wallet that supports Solana Devnet and legacy transactions. Your recovery phrase is never requested.';

    walletList = document.createElement('div');
    walletList.className = 'wallet-dialog-list';
    walletList.setAttribute('aria-label', 'Detected Solana wallets');

    disconnectButton = document.createElement('button');
    disconnectButton.type = 'button';
    disconnectButton.className = 'button wallet-dialog-action';
    disconnectButton.textContent = 'Disconnect wallet';
    disconnectButton.addEventListener('click', async () => {
      await window.walletManager.disconnect();
      renderState();
    });

    status = document.createElement('p');
    status.className = 'wallet-dialog-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    panel.append(close, heading, description, walletList, disconnectButton, status);
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
    if (!dialog || !window.walletManager) return;
    const manager = window.walletManager;
    const connected = manager.isConnected();
    const wallets = manager.getAvailableWallets();
    walletList.replaceChildren();
    disconnectButton.hidden = !connected;

    if (connected) {
      status.textContent = `Connected to ${manager.currentWallet} (${manager.shortenAddress(manager.currentAddress)}).`;
      return;
    }

    if (!wallets.length) {
      const empty = document.createElement('p');
      empty.className = 'wallet-dialog-empty';
      empty.textContent = 'No compatible Solana wallet was detected. Open this page in a Solana wallet browser or install a wallet that supports Wallet Standard on Devnet.';
      walletList.append(empty);
      status.textContent = '';
      return;
    }

    wallets.forEach(wallet => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'button wallet-dialog-action';
      button.textContent = `Connect ${wallet.name}`;
      button.addEventListener('click', () => connectWallet(wallet, button));
      walletList.append(button);
    });
    status.textContent = '';
  }

  async function connectWallet(wallet, button) {
    walletList.querySelectorAll('button').forEach(item => { item.disabled = true; });
    status.textContent = `Waiting for ${wallet.name} approval.`;
    let failed = false;
    try {
      const result = await window.walletManager.connect(wallet);
      status.textContent = `Connected to ${result.wallet} (${window.walletManager.shortenAddress(result.address)}).`;
      dialog.close();
    } catch (error) {
      status.textContent = error.message || 'Wallet connection was not completed.';
      failed = true;
    } finally {
      if (button.isConnected) button.disabled = false;
      if (failed) walletList.querySelectorAll('button').forEach(item => { item.disabled = false; });
      else renderState();
    }
  }

  function updateNavButtons({ wallet, address }) {
    const shortAddress = window.walletManager.shortenAddress(address);
    document.querySelectorAll('.wallet-button, #navWalletBtn').forEach(button => {
      button.textContent = `Wallet · ${shortAddress}`;
      button.setAttribute('aria-label', `Connected to ${wallet}: ${address}`);
      button.title = `Connected to ${wallet}: ${address}`;
      button.setAttribute('data-wallet-connected', 'true');
    });
    renderState();
  }

  function clearNavButtons() {
    document.querySelectorAll('.wallet-button, #navWalletBtn').forEach(button => {
      button.textContent = 'Connect wallet';
      button.setAttribute('aria-label', 'Connect Solana wallet');
      button.title = 'Connect Solana wallet';
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

  window.walletManager?.on('walletsChanged', renderState);
  window.walletManager?.on('connected', updateNavButtons);
  window.walletManager?.on('disconnected', clearNavButtons);
  window.openWalletModal = openModal;
  window.closeWalletModal = () => dialog?.close();
})();
