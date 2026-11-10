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
  let pendingRecovery = false;
  let pendingOutcome = null;
  let pendingStore = null;
  let pendingRecordInMemory = null;
  const checkPendingButton = document.getElementById('checkPendingPurchaseBtn');
  const dismissExpiredButton = document.getElementById('dismissExpiredPurchaseBtn');
  const SOL_FEE_RESERVE = 0.02;
  const MIN_USD_VALUE = 0.0001; // Minimum purchase: $0.0001 USD

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
    const data = account.data instanceof Uint8Array ? account.data : new Uint8Array(account.data);
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    return view.getBigUint64(64, true);
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
    quoteButton.disabled = value || pendingRecovery;
    buyButton.disabled = value || pendingRecovery || !activeQuote || !(window.walletManager && window.walletManager.canSignDevnet());
    quoteButton.textContent = pendingRecovery ? 'Resolve previous transaction first' : (value ? 'Please wait…' : 'Get Devnet quote');
    buyButton.textContent = pendingRecovery ? 'Previous transaction unresolved' : (value ? 'Waiting for wallet…' : (activeQuote ? 'Review and buy in wallet' : 'Connect wallet to buy'));
    if (useMaxBtn) useMaxBtn.disabled = value || pendingRecovery || !(window.walletManager && window.walletManager.isConnected());
  };

  function getPendingStore() {
    if (pendingStore) return pendingStore;
    if (!appConfig || !window.SpaceLedgerTxRecovery) return null;
    let storage = null;
    try { storage = window.localStorage; } catch (_) { /* browser storage may be disabled */ }
    pendingStore = window.SpaceLedgerTxRecovery.createPendingTransactionStore(
      storage,
      'space-ledger:devnet:' + appConfig.programId + ':pending-purchase:v1'
    );
    return pendingStore;
  }

  function clearPendingRecord(signature) {
    const store = getPendingStore();
    const cleared = Boolean(store && store.clear(signature));
    if (pendingRecordInMemory && pendingRecordInMemory.signature === signature) {
      pendingRecordInMemory = null;
      return true;
    }
    return cleared;
  }

  async function inspectSubmittedTransaction(connection, record) {
    if (!record.signature) {
      let ownership = null;
      try {
        const response = await fetch('/api/block-owner/' + encodeURIComponent(record.startBlock));
        ownership = await response.json();
      } catch (_) {}
      const receiptExists = Boolean(ownership && ownership.verified
        && ownership.owner === record.buyer
        && String(ownership.startBlock) === record.startBlock
        && Number(ownership.blockCount) === record.blockCount
        && Array.isArray(ownership.signatures)
        && ownership.signatures.some(item => item && !item.err && typeof item.signature === 'string'));
      if (receiptExists) {
        const signature = ownership.signatures.find(item => item && !item.err)?.signature || null;
        return { state:'confirmed', signature };
      }
      const [height, supplyResponse] = await Promise.all([
        connection.getBlockHeight('confirmed'),
        fetch('/api/supply')
      ]);
      const supply = await supplyResponse.json();
      return {
        state:window.SpaceLedgerTxRecovery.classifyUnsignedIntent({
          currentBlockHeight:height,
          lastValidBlockHeight:record.lastValidBlockHeight,
          currentSupply:supply.currentSupply,
          startBlock:record.startBlock,
          receiptVerified:false
        }),
        error:null
      };
    }
    let status = null;
    let currentBlockHeight = null;
    let lookupError = null;
    try {
      const response = await connection.getSignatureStatuses([record.signature], { searchTransactionHistory: true });
      status = response && Array.isArray(response.value) ? response.value[0] : null;
    } catch (error) {
      lookupError = error;
    }

    if (!status) {
      try { currentBlockHeight = await connection.getBlockHeight('confirmed'); }
      catch (error) { if (!lookupError) lookupError = error; }
    }

    let state = window.SpaceLedgerTxRecovery.classifySignatureStatus(
      status, currentBlockHeight, record.lastValidBlockHeight
    );

    if (state === 'unknown' || state === 'expired') {
      try {
        const transaction = await connection.getTransaction(record.signature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0
        });
        if (transaction && transaction.meta) state = transaction.meta.err ? 'failed' : 'confirmed';
      } catch (error) {
        if (!lookupError) lookupError = error;
      }
    }
    return { state, error: lookupError };
  }

  async function verifyPendingReceipt(record) {
    const response = await fetch('/api/block-owner/' + encodeURIComponent(record.startBlock));
    const ownership = await response.json();
    const matches = response.ok && ownership.verified
      && ownership.owner === record.buyer
      && String(ownership.startBlock) === record.startBlock
      && Number(ownership.blockCount) === record.blockCount
      && Array.isArray(ownership.signatures);
    if (!matches) return false;
    return record.signature
      ? ownership.signatures.some(item => item && item.signature === record.signature && !item.err)
      : ownership.signatures.some(item => item && typeof item.signature === 'string' && !item.err);
  }

  async function recoverPendingPurchase() {
    const store = getPendingStore();
    const record = (store && store.load()) || pendingRecordInMemory;
    if (!record) {
      pendingRecovery = false;
      pendingOutcome = null;
      if (checkPendingButton) checkPendingButton.hidden = true;
      if (dismissExpiredButton) dismissExpiredButton.hidden = true;
      setBusy(false);
      return;
    }

    pendingRecovery = true;
    pendingOutcome = null;
    activeQuote = null;
    setBusy(false);
    if (record.signature) {
      explorerLink.href = 'https://explorer.solana.com/tx/' + encodeURIComponent(record.signature) + '?cluster=devnet';
      explorerLink.hidden = false;
    } else {
      explorerLink.hidden = true;
    }
    if (checkPendingButton) checkPendingButton.hidden = false;
    if (dismissExpiredButton) dismissExpiredButton.hidden = true;
    setStatus('A previous Devnet purchase was submitted. Checking its actual on-chain status; do not submit another purchase yet.');
    setQuoteText(record.signature
      ? 'Recovering transaction ' + record.signature + '…'
      : 'Checking whether the wallet approved or submitted the saved purchase intent…');

    try {
      const connection = new window.solanaWeb3.Connection(appConfig.rpc, 'confirmed');
      const inspection = await inspectSubmittedTransaction(connection, record);
      pendingOutcome = inspection.state;

      if (inspection.state === 'failed') {
        clearPendingRecord(record.signature);
        pendingRecovery = false;
        pendingOutcome = null;
        if (checkPendingButton) checkPendingButton.hidden = true;
        if (dismissExpiredButton) dismissExpiredButton.hidden = true;
        setStatus('The previous Devnet transaction is confirmed failed. No purchase receipt was created by that transaction.');
        setQuoteText('Previous transaction failed on-chain. You may request a fresh quote.');
      } else if (inspection.state === 'confirmed') {
        const verified = record.signature
          ? await verifyPendingReceipt(record)
          : Boolean(inspection.signature && await verifyPendingReceipt({ ...record, signature:inspection.signature }));
        if (verified) {
          clearPendingRecord(record.signature);
          pendingRecovery = false;
          pendingOutcome = null;
          if (checkPendingButton) checkPendingButton.hidden = true;
          if (dismissExpiredButton) dismissExpiredButton.hidden = true;
          if (inspection.signature) {
            explorerLink.href = 'https://explorer.solana.com/tx/' + encodeURIComponent(inspection.signature) + '?cluster=devnet';
            explorerLink.hidden = false;
          }
          setStatus('The previous Devnet transaction and its ownership receipt are verified.');
          setQuoteText('Previous purchase confirmed: ' + record.blockCount.toLocaleString() + ' blocks from block ' + record.startBlock + '.');
        } else {
          pendingRecovery = true;
          setStatus('The transaction is confirmed, but its exact receipt is not yet verifiable through the API. Do not submit again; check again shortly.');
          setQuoteText('Confirmed on-chain, receipt verification still pending. The transaction signature is available in Explorer.');
        }
      } else if (inspection.state === 'expired') {
        pendingRecovery = true;
        if (dismissExpiredButton) dismissExpiredButton.hidden = false;
        setStatus(record.signature
          ? 'The transaction blockhash expired and the RPC cannot currently find a result. Check this exact signature in Explorer before clearing the warning.'
          : 'No signature was returned. The blockhash expired and Devnet supply is unchanged at this block, so the saved intent can be cleared safely.');
        setQuoteText(record.signature
          ? 'Outcome not verified. Do not retry until you have checked the signature in Solana Explorer.'
          : 'This intent did not consume the block range. Clear the expired intent before requesting a fresh quote.');
      } else {
        pendingRecovery = true;
        setStatus('The previous transaction is still pending or the RPC cannot establish its status. Do not submit again. Use Check previous transaction to recheck.');
        setQuoteText('Transaction status is not yet conclusive. The submitted signature is preserved for recovery.');
      }
    } catch (error) {
      pendingRecovery = true;
      setStatus('Could not verify the previous transaction. Do not submit again until its signature is checked.');
      setQuoteText('Transaction recovery check failed: ' + (error.message || 'RPC unavailable'));
    } finally {
      setBusy(false);
    }
  }

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
      buyButton.disabled = busy || pendingRecovery || !activeQuote;
      buyButton.textContent = pendingRecovery ? 'Previous transaction unresolved' : 'Connect wallet to buy';
      balanceStatus.textContent = 'Connect a Solana Devnet wallet to show balance and size the quote to what you can afford.';
      if (useMaxBtn) useMaxBtn.disabled = true;
      return;
    }
    if (useMaxBtn) useMaxBtn.disabled = busy || pendingRecovery;
    await refreshBalances();
    const solTxt = lastSolLamports != null ? lamportsText(lastSolLamports) : 'unknown';
    const usdcTxt = lastUsdcMicro != null ? usdcFromMicro(lastUsdcMicro).toFixed(6) + ' USDC' : '0 USDC';
    if (window.walletManager.canSignDevnet()) {
      buyButton.disabled = busy || pendingRecovery || !activeQuote;
      buyButton.textContent = pendingRecovery ? 'Previous transaction unresolved' : (activeQuote ? 'Review and buy in wallet' : 'Get a quote to buy');
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
      await recoverPendingPurchase();
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
    if (pendingRecovery) return setQuoteText('Resolve the previously submitted transaction before requesting another quote.');
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

      // Validate minimum USD value ($0.0001)
      const totalUsdValue = Number(data.priceMicroUsd) / 1e6;
      if (totalUsdValue < MIN_USD_VALUE) {
        activeQuote = null;
        setQuoteText('Minimum purchase is $0.0001 USD. This quote is only $' + totalUsdValue.toFixed(6) + ' USD. Increase your budget to meet the minimum.');
        if (window.SpaceLedgerToast) window.SpaceLedgerToast.show('Purchase amount below minimum ($0.0001 USD)', { error: true });
        return;
      }

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
      let simulation;
      try {
        simulation = await connection.simulateTransaction(transaction, [], false);
      } catch (error) {
        throw new Error('Devnet transaction preflight could not be completed; no wallet approval was requested. ' + (error.message || 'RPC unavailable.'));
      }
      const simulationFailure = window.SpaceLedgerTxRecovery.formatSimulationFailure(simulation);
      if (simulationFailure) throw new Error(simulationFailure);
      setQuoteText(quoteSummary(activeQuote) + '\n\nPreflight passed. Review network, recipient, block count, and spend in your wallet before approving.');
      const pendingRecord = {
        version:2,
        network:'devnet',
        stage:'awaiting_wallet',
        signature:null,
        blockhash:transactionData.blockhash,
        lastValidBlockHeight:transactionData.lastValidBlockHeight,
        buyer:wallet.address,
        startBlock:transactionData.startBlock,
        blockCount:transactionData.blockCount,
        asset:activeQuote.asset,
        submittedAt:Date.now()
      };
      pendingRecordInMemory = pendingRecord;
      const store = getPendingStore();
      const persistedIntent = Boolean(store && store.save(pendingRecord));
      if (!persistedIntent) setStatus('Browser storage is unavailable. Keep this page open while wallet approval is in progress.');

      let signature;
      try {
        signature = await window.walletManager.signAndSendTransaction(transaction, { preflightCommitment:'confirmed' });
      } catch (walletError) {
        if (window.SpaceLedgerTxRecovery.isUserRejected(walletError)) {
          clearPendingRecord(null);
          pendingRecordInMemory = null;
          pendingRecovery = false;
          throw new Error('The wallet request was rejected. No purchase was submitted.');
        }
        pendingRecovery = true;
        pendingOutcome = 'unknown';
        pendingRecord.stage = 'unknown';
        if (store) store.save(pendingRecord);
        if (checkPendingButton) checkPendingButton.hidden = false;
        throw new Error('The wallet did not return a conclusive result. The purchase intent is saved; do not submit again while recovery checks the chain. ' + (walletError.message || 'Wallet response unavailable.'));
      }
      if (typeof signature !== 'string' || !signature) {
        pendingRecovery = true;
        pendingOutcome = 'unknown';
        pendingRecord.stage = 'unknown';
        if (store) store.save(pendingRecord);
        if (checkPendingButton) checkPendingButton.hidden = false;
        throw new Error('The wallet returned no transaction signature. The original intent is preserved; do not submit another purchase until recovery finishes.');
      }
      pendingRecord.stage = 'submitted';
      pendingRecord.signature = signature;
      pendingRecordInMemory = pendingRecord;
      const persisted = Boolean(store && store.save(pendingRecord));
      setQuoteText('Transaction submitted to Solana Devnet. Waiting for confirmation…');
      explorerLink.href = 'https://explorer.solana.com/tx/' + encodeURIComponent(signature) + '?cluster=devnet';
      explorerLink.hidden = false;
      if (!persisted) {
        setStatus('The transaction was submitted, but browser storage is unavailable. Keep this page open until its signature and receipt are verified.');
      }

      let confirmation;
      try {
        confirmation = await connection.confirmTransaction({
          signature,
          blockhash: transactionData.blockhash,
          lastValidBlockHeight: transactionData.lastValidBlockHeight
        }, 'confirmed');
      } catch (confirmationError) {
        const inspection = await inspectSubmittedTransaction(connection, pendingRecord);
        if (inspection.state === 'failed') {
          clearPendingRecord(signature);
          throw new Error('The Devnet transaction is confirmed failed. No ownership was recorded.');
        }
        if (inspection.state !== 'confirmed') {
          pendingRecovery = true;
          pendingOutcome = inspection.state;
          if (checkPendingButton) checkPendingButton.hidden = false;
          if (inspection.state === 'expired' && dismissExpiredButton) dismissExpiredButton.hidden = false;
          throw new Error('The transaction was submitted but confirmation is not yet conclusive. Do not submit another purchase. Check Explorer or use Check previous transaction. Signature: ' + signature);
        }
        confirmation = { value: { err: null } };
      }
      if (confirmation.value.err) {
        clearPendingRecord(signature);
        throw new Error('The Devnet transaction failed on-chain. No ownership was recorded.');
      }
      let receiptVerified = false;
      try {
        receiptVerified = await verifyPendingReceipt(pendingRecord);
      } catch (_) {
        receiptVerified = false;
      }
      if (!receiptVerified) {
        pendingRecovery = true;
        pendingOutcome = 'confirmed';
        if (checkPendingButton) checkPendingButton.hidden = false;
        throw new Error('Payment is confirmed, but the matching ownership receipt is not yet verifiable. Do not submit again; use Check previous transaction. Signature: ' + signature);
      }
      clearPendingRecord(signature);
      pendingRecovery = false;
      pendingOutcome = null;
      if (checkPendingButton) checkPendingButton.hidden = true;
      if (dismissExpiredButton) dismissExpiredButton.hidden = true;
      const confirmedMessage = 'Purchase confirmed. ' + transactionData.blockCount.toLocaleString() + ' blocks from ' + activeQuote.firstLabel + '. Supply advanced — next blocks cost more.';
      activeQuote = null;
      quoteOutput.textContent = confirmedMessage;
      explorerLink.href = 'https://explorer.solana.com/tx/' + encodeURIComponent(signature) + '?cluster=devnet';
      explorerLink.hidden = false;

      // The verified on-chain receipt is the success condition. Balance/config refreshes
      // are informational and must never turn a successful purchase into a failure message.
      try {
        const solAfter = await solBalance(connection, wallet.address);
        const assetAfter = await selectedBalance(connection, pendingRecord.asset, wallet.address);
        balanceStatus.textContent = pendingRecord.asset === 'SOL'
          ? 'Devnet SOL: ' + lamportsText(solBefore) + ' → ' + lamportsText(solAfter) + '.'
          : 'Devnet USDC: ' + (Number(assetBefore) / 1e6).toFixed(6) + ' → ' + (Number(assetAfter) / 1e6).toFixed(6) + '; SOL: ' + lamportsText(solBefore) + ' → ' + lamportsText(solAfter) + '.';
      } catch (_) {
        balanceStatus.textContent = 'The purchase receipt is verified. The latest wallet balance could not be refreshed from the Devnet RPC.';
      }

      if (window.SpaceLedgerToast) {
        window.SpaceLedgerToast.show(
          '<strong>Purchase confirmed on Devnet.</strong><br>Supply advanced — the next block is priced higher.<br><a href="' + explorerLink.href + '" target="_blank" rel="noopener noreferrer">Open Explorer</a>',
          { ok: true, duration: 12000 }
        );
      }
      try {
        await loadConfig();
      } catch (_) {
        setStatus('Purchase confirmed and receipt verified. The latest ledger summary could not be refreshed from Devnet RPC.');
      }
    } catch (error) {
      setQuoteText(error.message || 'The Devnet purchase did not complete.');
      if (window.SpaceLedgerToast) window.SpaceLedgerToast.show(String(error.message || 'Purchase did not complete'), { error: true, duration: 9000 });
    } finally {
      setBusy(false);
      await refreshWalletStatus();
    }
  });

  if (checkPendingButton) checkPendingButton.addEventListener('click', function () {
    checkPendingButton.disabled = true;
    recoverPendingPurchase().finally(function () { checkPendingButton.disabled = false; });
  });
  if (dismissExpiredButton) dismissExpiredButton.addEventListener('click', function () {
    if (pendingOutcome !== 'expired') return;
    const store = getPendingStore();
    const record = (store && store.load()) || pendingRecordInMemory;
    const confirmation = record && record.signature
      ? 'Only clear this expired transaction after checking this exact signature in Solana Explorer. Continue?'
      : 'The purchase intent expired and Devnet supply is unchanged at its start block. Clear the saved intent so you can request a fresh quote?';
    if (!record || !window.confirm(confirmation)) return;
    if (!clearPendingRecord(record.signature)) return;
    pendingRecovery = false;
    pendingOutcome = null;
    dismissExpiredButton.hidden = true;
    if (checkPendingButton) checkPendingButton.hidden = true;
    explorerLink.hidden = true;
    activeQuote = null;
    setStatus('The expired transaction warning was cleared after your manual Explorer check. Request a new Devnet quote before any new purchase.');
    setQuoteText('No previous purchase was resubmitted.');
    setBusy(false);
  });
  if (useMaxBtn) useMaxBtn.addEventListener('click', function () { applyMaxBalance().catch(function () {}); });
  if (form.elements.asset) form.elements.asset.addEventListener('change', function () { activeQuote = null; refreshWalletStatus(); });
  if (window.walletManager) {
    window.walletManager.on('connected', refreshWalletStatus);
    window.walletManager.on('disconnected', refreshWalletStatus);
  }
  loadConfig();
})();
