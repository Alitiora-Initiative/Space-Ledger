(function () {
  const status = document.getElementById('purchaseStatus');
  const card = document.getElementById('devnetPurchase');
  const form = document.getElementById('devnetPurchaseForm');
  const quoteOutput = document.getElementById('purchaseQuote');
  const balanceStatus = document.getElementById('walletBalanceStatus');
  const quoteButton = document.getElementById('quotePurchaseBtn');
  const buyButton = document.getElementById('buyBlocksBtn');
  const explorerLink = document.getElementById('purchaseExplorerLink');
  const useMaxBtn = document.getElementById('useMaxBalanceBtn');
  if (!status || !card || !form || !quoteOutput || !buyButton) return;

  let appConfig = null;
  let activeQuote = null;
  let busy = false;
  let lastSolLamports = null;
  let lastUsdcMicro = null;
  const SOL_FEE_RESERVE = 0.02;

  const setStatus = message => { status.textContent = message; };
  const setQuoteText = message => { quoteOutput.textContent = message; };
  const lamportsText = value => (Number(value) / 1e9).toFixed(6) + ' SOL';
  const solFromLamports = lamports => Number(lamports) / 1e9;
  const usdcFromMicro = micro => Number(micro) / 1e6;

  function insufficientMessage(asset, available, required, detail) {
    if (asset === 'SOL') {
      return [
        'Insufficient Devnet SOL for this purchase.',
        'Available in connected wallet: ' + available.toFixed(6) + ' SOL',
        'Required by this quote (blocks + $0.10 fee): ' + required.toFixed(9) + ' SOL',
        detail || 'Reduce the budget, use “Use available balance”, or fund this Devnet wallet, then request a new quote.',
        'Network fees are additional; a small SOL reserve is kept when suggesting max balance.'
      ].join('\n');
    }
    return [
      'Insufficient Devnet USDC for this purchase.',
      'Available: ' + available.toFixed(6) + ' USDC',
      'Required by this quote: ' + required.toFixed(6) + ' USDC',
      detail || 'Reduce the budget, switch asset, or fund the wallet, then request a new quote.',
      'You still need a small amount of Devnet SOL for network fees.'
    ].join('\n');
  }

  async function solBalance(connection, address) {
    return BigInt(await connection.getBalance(new window.solanaWeb3.PublicKey(address), 'confirmed'));
  }

  async function usdcBalance(connection, address) {
    const { PublicKey } = window.solanaWeb3;
    const owner = new PublicKey(address);
    const mint = new PublicKey(appConfig.usdcMint);
    const tokenProgram = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    const associatedProgram = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
    const [addressAta] = PublicKey.findProgramAddressSync([owner.toBuffer(), tokenProgram.toBuffer(), mint.toBuffer()], associatedProgram);
    const account = await connection.getAccountInfo(addressAta, 'confirmed');
    if (!account) return 0n;
    if (!account.owner.equals(tokenProgram) || account.data.length < 72) throw new Error('The connected Devnet USDC account is invalid.');
    return account.data.readBigUInt64LE(64);
  }

  async function selectedBalance(connection, asset, address) {
    return asset === 'SOL' ? solBalance(connection, address) : usdcBalance(connection, address);
  }

  async function refreshBalances() {
    const wallet = window.walletManager && window.walletManager.getWalletInfo();
    if (!wallet || !wallet.connected || !appConfig || !window.solanaWeb3 || !window.solanaWeb3.Connection) {
      lastSolLamports = null;
      lastUsdcMicro = null;
      return null;
    }
    const connection = new window.solanaWeb3.Connection(appConfig.rpc, 'confirmed');
    try { lastSolLamports = await solBalance(connection, wallet.address); } catch (_) { lastSolLamports = null; }
    try { lastUsdcMicro = await usdcBalance(connection, wallet.address); } catch (_) { lastUsdcMicro = 0n; }
    return { connection, wallet };
  }

  function maxSpendableToken(asset) {
    if (asset === 'SOL') {
      if (lastSolLamports == null) return null;
      const sol = solFromLamports(lastSolLamports) - SOL_FEE_RESERVE;
      return Math.max(0, Math.floor(sol * 1e9) / 1e9);
    }
    if (lastUsdcMicro == null) return null;
    return Math.max(0, usdcFromMicro(lastUsdcMicro));
  }

  const setBusy = value => {
    busy = value;
    quoteButton.disabled = value;
    buyButton.disabled = value || !activeQuote || !(window.walletManager && window.walletManager.canSignDevnet());
    quoteButton.textContent = value ? 'Please wait…' : 'Get Devnet quote';
    buyButton.textContent = value ? 'Waiting for wallet…' : (activeQuote ? 'Review and buy in wallet' : 'Connect wallet to buy');
    if (useMaxBtn) useMaxBtn.disabled = value || !(window.walletManager && window.walletManager.isConnected());
  };

  function quoteSummary(quote, balanceNote) {
    const unitScale = quote.asset === 'SOL' ? 1e9 : 1e6;
    const unitDigits = quote.asset === 'SOL' ? 9 : 6;
    const enteredBudget = (Number(quote.budgetUnits) / unitScale).toFixed(unitDigits);
    const paymentNum = Number(quote.paymentUnits) / unitScale;
    const usdHint = quote.asset === 'SOL' && quote.solUsd
      ? ' (~$' + (paymentNum * quote.solUsd).toFixed(2) + ' at Pyth $' + quote.solUsd.toFixed(2) + '/SOL)'
      : '';
    const lines = [
      quote.blockCount.toLocaleString() + ' blocks: ' + quote.firstLabel + '–' + quote.lastLabel,
      'Curve total for this range: $' + (Number(quote.priceMicroUsd) / 1e6).toFixed(6) + ' (linear primary sale)',
      'Test platform fee: $' + (Number(quote.feeMicroUsd) / 1e6).toFixed(2),
      'You will pay up to: ' + quote.paymentAmount + usdHint,
      'Budget used for this quote: ' + enteredBudget + ' ' + quote.asset,
      quote.asset === 'SOL' ? 'Pyth SOL/USD (Devnet feed): $' + quote.solUsd.toFixed(2) : 'Devnet USDC mint: ' + appConfig.usdcMint,
      'Recipient treasury: ' + appConfig.treasury,
      'After confirmation, on-chain supply increases and later blocks cost more.',
      'Plus a small network fee. Devnet tokens have no real-world value.'
    ];
    if (balanceNote) lines.push(balanceNote);
    return lines.join('\n');
  }

  async function refreshWalletStatus() {
    const wallet = window.walletManager && window.walletManager.getWalletInfo();
    if (!wallet || !wallet.connected) {
      buyButton.disabled = busy || !activeQuote;
      buyButton.textContent = 'Connect wallet to buy';
      balanceStatus.textContent = 'Connect a Solana Devnet wallet to show balance and size the quote to what you can afford.';
      if (useMaxBtn) useMaxBtn.disabled = true;
      return;
    }
    if (useMaxBtn) useMaxBtn.disabled = busy;
    await refreshBalances();
    const solTxt = lastSolLamports != null ? lamportsText(lastSolLamports) : 'unknown';
    const usdcTxt = lastUsdcMicro != null ? usdcFromMicro(lastUsdcMicro).toFixed(6) + ' USDC' : '0 USDC';
    if (window.walletManager.canSignDevnet()) {
      buyButton.disabled = busy || !activeQuote;
      buyButton.textContent = activeQuote ? 'Review and buy in wallet' : 'Get a quote to buy';
      setStatus('Connected: ' + wallet.wallet + ' · ' + wallet.address + '. Quotes respect your Devnet balance.');
      balanceStatus.textContent = wallet.wallet + ' — Devnet SOL: ' + solTxt + '; Devnet USDC: ' + usdcTxt +
        '. SOL purchases reserve ~' + SOL_FEE_RESERVE + ' SOL for network fees when using “Use available balance”.';
    } else {
      buyButton.disabled = true;
      setStatus('This wallet cannot sign Solana Devnet transactions. Choose a compatible wallet.');
      balanceStatus.textContent = 'Devnet SOL: ' + solTxt + '; Devnet USDC: ' + usdcTxt + '.';
    }
  }

  async function applyMaxBalance() {
    await refreshBalances();
    const asset = form.elements.asset.value;
    const max = maxSpendableToken(asset);
    if (max == null) {
      setQuoteText('Connect a wallet and wait for the balance to load, then try again.');
      if (window.SpaceLedgerToast) window.SpaceLedgerToast.show('Connect a Devnet wallet to use available balance.', { error: true });
      return;
    }
    if (max <= 0) {
      setQuoteText(asset === 'SOL'
        ? 'No spendable Devnet SOL after reserving ' + SOL_FEE_RESERVE + ' SOL for network fees. Fund this Devnet wallet, then try again.'
        : 'No Devnet USDC in this wallet. Fund the account, then try again.');
      if (window.SpaceLedgerToast) window.SpaceLedgerToast.show('Insufficient balance to size a purchase.', { error: true });
      return;
    }
    form.elements.amount.value = String(max);
    setQuoteText('Budget set to ' + max + ' ' + asset + ' (aligned with wallet balance). Click “Get Devnet quote”.');
  }

  async function loadConfig() {
    try {
      const response = await fetch('/api/solana/config');
      const config = await response.json();
      if (!response.ok) throw new Error(config.error || 'The Devnet program is not configured yet.');
      if (config.network !== 'devnet') throw new Error('Purchases are restricted to Solana Devnet.');
      appConfig = config;
      card.hidden = false;
      setStatus(config.initialized
        ? 'Devnet program is live. Enter a budget you can afford, or use available balance. Each buy advances supply on the linear curve.'
        : 'The Devnet program is deployed. The first approved purchase initializes the ledger.');
      await refreshWalletStatus();
      const nextLine = document.getElementById('nextBlockPriceLine');
      if (nextLine && config.currentSupply != null) {
        const supply = Number(config.currentSupply);
        const price = 0.001 + (1000 - 0.001) * (supply / 1e10);
        nextLine.textContent = 'Next block model price ≈ $' + price.toFixed(6) + ' (after ' + supply.toLocaleString() + ' blocks sold). Each buy raises this for later buyers.';
      }
    } catch (error) {
      card.hidden = true;
      setStatus(error.message);
    }
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (!appConfig) return setQuoteText('The Devnet program is unavailable.');
    setBusy(true);
    activeQuote = null;
    explorerLink.hidden = true;
    setQuoteText('Reading on-chain supply and sizing a quote to your budget…');
    try {
      await refreshBalances();
      const asset = form.elements.asset.value;
      const amount = Number(form.elements.amount.value);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter a positive budget in Devnet SOL or USDC.');

      if (window.walletManager && window.walletManager.isConnected()) {
        const max = maxSpendableToken(asset);
        if (max != null && max <= 0) {
          activeQuote = null;
          const avail = asset === 'SOL' ? (lastSolLamports != null ? solFromLamports(lastSolLamports) : 0) : (lastUsdcMicro != null ? usdcFromMicro(lastUsdcMicro) : 0);
          setQuoteText(insufficientMessage(asset, avail, amount, 'No spendable balance after fee reserve.\n'));
          if (window.SpaceLedgerToast) window.SpaceLedgerToast.show('Insufficient balance for a quote at this budget.', { error: true });
          return;
        }
        if (max != null && amount > max + 1e-12) {
          const availableDisplay = asset === 'SOL'
            ? (lastSolLamports != null ? solFromLamports(lastSolLamports) : 0)
            : (lastUsdcMicro != null ? usdcFromMicro(lastUsdcMicro) : 0);
          setQuoteText(insufficientMessage(asset, availableDisplay, amount, 'Your budget is above what this wallet can safely spend. Lower the amount or click “Use available balance”.\n'));
          if (window.SpaceLedgerToast) {
            window.SpaceLedgerToast.show(
              asset === 'SOL'
                ? 'Budget exceeds available Devnet SOL (' + availableDisplay.toFixed(4) + ' SOL).'
                : 'Budget exceeds available Devnet USDC (' + availableDisplay.toFixed(4) + ' USDC).',
              { error: true }
            );
          }
          return;
        }
      }

      const response = await fetch('/api/solana/quote?asset=' + encodeURIComponent(asset) + '&amount=' + encodeURIComponent(String(amount)));
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Devnet quote unavailable.');

      if (window.walletManager && window.walletManager.isConnected()) {
        const unitScale = data.asset === 'SOL' ? 1e9 : 1e6;
        const required = Number(data.paymentUnits) / unitScale;
        if (data.asset === 'SOL' && lastSolLamports != null) {
          const available = solFromLamports(lastSolLamports);
          if (required > available - 0.001) {
            activeQuote = null;
            setQuoteText(insufficientMessage('SOL', available, required, ''));
            if (window.SpaceLedgerToast) window.SpaceLedgerToast.show('Not enough Devnet SOL for this quote.', { error: true });
            return;
          }
        }
        if (data.asset === 'USDC' && lastUsdcMicro != null) {
          const available = usdcFromMicro(lastUsdcMicro);
          if (required > available + 1e-9) {
            activeQuote = null;
            setQuoteText(insufficientMessage('USDC', available, required, ''));
            if (window.SpaceLedgerToast) window.SpaceLedgerToast.show('Not enough Devnet USDC for this quote.', { error: true });
            return;
          }
        }
      }

      activeQuote = data;
      const balNote = data.asset === 'SOL' && lastSolLamports != null
        ? 'Wallet Devnet SOL: ' + lamportsText(lastSolLamports) + ' (sufficient for this quote).'
        : data.asset === 'USDC' && lastUsdcMicro != null
          ? 'Wallet Devnet USDC: ' + usdcFromMicro(lastUsdcMicro).toFixed(6) + ' (sufficient for this quote).'
          : null;
      quoteOutput.textContent = quoteSummary(data, balNote);
      await refreshWalletStatus();
    } catch (error) {
      activeQuote = null;
      setQuoteText(error.message || 'Could not build a quote.');
      if (window.SpaceLedgerToast) window.SpaceLedgerToast.show(String(error.message || 'Quote failed'), { error: true });
    } finally {
      setBusy(false);
      await refreshWalletStatus();
    }
  });

  buyButton.addEventListener('click', async function () {
    if (busy || !activeQuote || !appConfig) return;
    if (!window.walletManager || !window.walletManager.canSignDevnet()) {
      if (window.openWalletModal) window.openWalletModal();
      setStatus('Connect a compatible Solana Devnet wallet, then select Review and buy.');
      return;
    }
    setBusy(true);
    try {
      await refreshBalances();
      const unitScale = activeQuote.asset === 'SOL' ? 1e9 : 1e6;
      const required = Number(activeQuote.paymentUnits) / unitScale;
      if (activeQuote.asset === 'SOL' && lastSolLamports != null) {
        const available = solFromLamports(lastSolLamports);
        if (required > available - 0.001) throw new Error(insufficientMessage('SOL', available, required, ''));
      }
      if (activeQuote.asset === 'USDC' && lastUsdcMicro != null) {
        const available = usdcFromMicro(lastUsdcMicro);
        if (required > available + 1e-9) throw new Error(insufficientMessage('USDC', available, required, ''));
      }
      const wallet = window.walletManager.getWalletInfo();
      const response = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          buyer: wallet.address,
          asset: activeQuote.asset,
          blockCount: activeQuote.blockCount,
          budget: activeQuote.paymentUnits
        })
      });
      const transactionData = await response.json();
      if (!response.ok) throw new Error(transactionData.error || 'Could not prepare the Devnet transaction. Request a fresh quote.');
      if (transactionData.startBlock !== activeQuote.startBlock || transactionData.blockCount !== activeQuote.blockCount || transactionData.priceMicroUsd !== activeQuote.priceMicroUsd) {
        throw new Error('Devnet supply changed after this quote. Request a fresh quote before proceeding.');
      }
      const binary = Uint8Array.from(atob(transactionData.transaction), function (c) { return c.charCodeAt(0); });
      const transaction = window.solanaWeb3.Transaction.from(binary);
      const connection = new window.solanaWeb3.Connection(appConfig.rpc, 'confirmed');
      const solBefore = await solBalance(connection, wallet.address);
      const assetBefore = await selectedBalance(connection, activeQuote.asset, wallet.address);
      setQuoteText(quoteSummary(activeQuote) + '\n\nPreparing wallet approval…');
      try { await connection.simulateTransaction(transaction, [], false); } catch (_) {}
      setQuoteText(quoteSummary(activeQuote) + '\n\nReview network, recipient, block count, and spend in your wallet before approving.');
      const signature = await window.walletManager.signAndSendTransaction(transaction, { preflightCommitment: 'confirmed' });
      if (!signature) throw new Error('The wallet did not return a transaction signature.');
      setQuoteText('Transaction submitted to Solana Devnet. Waiting for confirmation…');
      const confirmation = await connection.confirmTransaction({
        signature: signature,
        blockhash: transactionData.blockhash,
        lastValidBlockHeight: transactionData.lastValidBlockHeight
      }, 'confirmed');
      if (confirmation.value.err) throw new Error('The Devnet transaction failed. No ownership was recorded.');
      const firstBlockResponse = await fetch('/api/block-owner/' + encodeURIComponent(transactionData.startBlock));
      const ownership = await firstBlockResponse.json();
      if (!firstBlockResponse.ok || !ownership.verified || ownership.owner !== wallet.address) {
        throw new Error('Payment confirmed, but the ownership receipt could not yet be verified. Check Explorer and reload shortly.');
      }
      const solAfter = await solBalance(connection, wallet.address);
      const assetAfter = await selectedBalance(connection, activeQuote.asset, wallet.address);
      balanceStatus.textContent = activeQuote.asset === 'SOL'
        ? 'Devnet SOL: ' + lamportsText(solBefore) + ' → ' + lamportsText(solAfter) + '.'
        : 'Devnet USDC: ' + (Number(assetBefore) / 1e6).toFixed(6) + ' → ' + (Number(assetAfter) / 1e6).toFixed(6) + '; SOL: ' + lamportsText(solBefore) + ' → ' + lamportsText(solAfter) + '.';
      quoteOutput.textContent = 'Purchase confirmed. ' + transactionData.blockCount.toLocaleString() + ' blocks from ' + activeQuote.firstLabel + '. Supply advanced — next blocks cost more.';
      explorerLink.href = 'https://explorer.solana.com/tx/' + encodeURIComponent(signature) + '?cluster=devnet';
      explorerLink.hidden = false;
      if (window.SpaceLedgerToast) {
        window.SpaceLedgerToast.show(
          '<strong>Purchase confirmed on Devnet.</strong><br>Supply advanced — the next block is priced higher.<br><a href="' + explorerLink.href + '" target="_blank" rel="noopener noreferrer">Open Explorer</a>',
          { ok: true, duration: 12000 }
        );
      }
      activeQuote = null;
      await loadConfig();
    } catch (error) {
      setQuoteText(error.message || 'The Devnet purchase did not complete.');
      if (window.SpaceLedgerToast) window.SpaceLedgerToast.show(String(error.message || 'Purchase did not complete'), { error: true, duration: 9000 });
    } finally {
      setBusy(false);
      await refreshWalletStatus();
    }
  });

  if (useMaxBtn) useMaxBtn.addEventListener('click', function () { applyMaxBalance().catch(function () {}); });
  if (form.elements.asset) form.elements.asset.addEventListener('change', function () { activeQuote = null; refreshWalletStatus(); });
  if (window.walletManager) {
    window.walletManager.on('connected', refreshWalletStatus);
    window.walletManager.on('disconnected', refreshWalletStatus);
  }
  loadConfig();
})();
