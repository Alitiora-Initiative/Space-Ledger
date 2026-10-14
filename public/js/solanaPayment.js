(function () {
  const status = document.getElementById('purchaseStatus');
  const card = document.getElementById('devnetPurchase');
  const form = document.getElementById('devnetPurchaseForm');
  const quoteOutput = document.getElementById('purchaseQuote');
  const balanceStatus = document.getElementById('walletBalanceStatus');
  const quoteButton = document.getElementById('quotePurchaseBtn');
  const buyButton = document.getElementById('buyBlocksBtn');
  const explorerLink = document.getElementById('purchaseExplorerLink');
  if (!status || !card || !form || !quoteOutput || !buyButton) return;

  let appConfig = null;
  let activeQuote = null;
  let busy = false;

  const setStatus = message => { status.textContent = message; };
  const setQuoteText = message => { quoteOutput.textContent = message; };
  const lamportsText = value => `${(Number(value) / 1_000_000_000).toFixed(6)} SOL`;

  async function solBalance(connection, address) {
    const key = new window.solanaWeb3.PublicKey(address);
    return BigInt(await connection.getBalance(key, 'confirmed'));
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
  const setBusy = value => {
    busy = value;
    quoteButton.disabled = value;
    buyButton.disabled = value || !activeQuote || !window.walletManager?.canSignDevnet();
    quoteButton.textContent = value ? 'Please wait…' : 'Get Devnet quote';
    buyButton.textContent = value ? 'Waiting for wallet…' : (activeQuote ? 'Review and buy in wallet' : 'Connect wallet to buy');
  };

  function quoteSummary(quote) {
    const unitScale = quote.asset === 'SOL' ? 1_000_000_000 : 1_000_000;
    const unitDigits = quote.asset === 'SOL' ? 9 : 6;
    const enteredBudget = (Number(quote.budgetUnits) / unitScale).toFixed(unitDigits);
    const lines = [
      `${quote.blockCount.toLocaleString()} blocks: ${quote.firstLabel}–${quote.lastLabel}`,
      `Block price (this range): $${(Number(quote.priceMicroUsd) / 1_000_000).toFixed(6)}`,
      `Test platform fee: $${(Number(quote.feeMicroUsd) / 1_000_000).toFixed(2)}`,
      `Maximum charged by the program: ${quote.paymentAmount}; your entered budget limit is ${enteredBudget} ${quote.asset}`,
      quote.asset === 'SOL' ? `Pyth SOL/USD: $${quote.solUsd.toFixed(2)}` : `Devnet USDC mint: ${appConfig.usdcMint}`,
      `Recipient: ${appConfig.treasury}`,
      'Linear curve: after this purchase, on-chain supply advances and the next blocks cost more.',
      'Plus Solana network fee and, if needed, token-account rent. Devnet tokens have no real-world value.'
    ];
    return lines.join('\n');
  }

  async function refreshWalletStatus() {
    const wallet = window.walletManager?.getWalletInfo();
    if (!wallet?.connected) {
      buyButton.disabled = busy || !activeQuote;
      buyButton.textContent = activeQuote ? 'Connect wallet to buy' : 'Connect wallet to buy';
      balanceStatus.textContent = 'Connect a compatible Solana Devnet wallet to display its balance.';
      return;
    }
    if (window.walletManager.canSignDevnet()) {
      buyButton.disabled = busy || !activeQuote;
      buyButton.textContent = activeQuote ? 'Review and buy in wallet' : 'Connect wallet to buy';
      setStatus(`Devnet program ready. ${wallet.wallet} connected: ${wallet.address}. Review every amount in your wallet before approving.`);
      if (appConfig && window.solanaWeb3?.Connection) {
        try {
          const connection = new window.solanaWeb3.Connection(appConfig.rpc, 'confirmed');
          const balance = await solBalance(connection, wallet.address);
          balanceStatus.textContent = `${wallet.wallet} Devnet SOL balance: ${lamportsText(balance)}. This is the buyer wallet; payments go to ${appConfig.treasury}.`;
        } catch (_) {
          balanceStatus.textContent = 'Could not load the connected wallet’s Devnet balance. Check the RPC connection.';
        }
      }
    } else {
      buyButton.disabled = true;
      setStatus('The connected wallet cannot sign Solana Devnet legacy transactions. Choose a compatible wallet to purchase blocks.');
      balanceStatus.textContent = 'Connect a compatible Solana Devnet wallet to display its balance.';
    }
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
        ? 'Devnet ownership program is live. Quotes use live supply on the linear curve (each buy raises the next price).'
        : 'The Devnet program is deployed. Its first approved purchase will initialize the ledger and record ownership.');
      await refreshWalletStatus();
      const nextLine = document.getElementById('nextBlockPriceLine');
      if (nextLine && config.currentSupply != null) {
        const START = 0.001, TARGET = 1000, TOTAL = 10_000_000_000;
        const supply = Number(config.currentSupply);
        const price = START + (TARGET - START) * (supply / TOTAL);
        nextLine.textContent = 'Next block model price ≈ $' + price.toFixed(6) + ' (after ' + supply.toLocaleString() + ' blocks sold). Each buy raises this for later buyers.';
      }
    } catch (error) {
      card.hidden = true;
      setStatus(error.message);
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!appConfig) return setQuoteText('The Devnet program is unavailable.');
    setBusy(true);
    activeQuote = null;
    explorerLink.hidden = true;
    setQuoteText('Checking current on-chain supply and token price…');
    try {
      const asset = form.elements.asset.value;
      const amount = form.elements.amount.value;
      const response = await fetch(`/api/solana/quote?asset=${encodeURIComponent(asset)}&amount=${encodeURIComponent(amount)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Devnet quote unavailable.');
      activeQuote = data;
      quoteOutput.textContent = quoteSummary(data);
      await refreshWalletStatus();
    } catch (error) {
      setQuoteText(error.message);
    } finally {
      setBusy(false);
      await refreshWalletStatus();
    }
  });

  buyButton.addEventListener('click', async () => {
    if (busy || !activeQuote || !appConfig) return;
    if (!window.walletManager?.canSignDevnet()) {
      window.openWalletModal?.();
      setStatus('Connect a compatible Solana Devnet wallet, then select Review and buy.');
      return;
    }

    setBusy(true);
    try {
      if (!window.solanaWeb3?.Transaction || !window.walletManager?.canSignDevnet()) {
        throw new Error('A compatible Solana Devnet wallet is required for a purchase.');
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
      if (transactionData.startBlock !== activeQuote.startBlock
        || transactionData.blockCount !== activeQuote.blockCount
        || transactionData.priceMicroUsd !== activeQuote.priceMicroUsd) {
        throw new Error('Devnet supply changed after this quote. Request a fresh quote before proceeding.');
      }
      const binary = Uint8Array.from(atob(transactionData.transaction), character => character.charCodeAt(0));
      const transaction = window.solanaWeb3.Transaction.from(binary);
      const connection = new window.solanaWeb3.Connection(appConfig.rpc, 'confirmed');
      const solBefore = await solBalance(connection, wallet.address);
      const assetBefore = await selectedBalance(connection, activeQuote.asset, wallet.address);
      setQuoteText(`${quoteSummary(activeQuote)}\n\nSimulating this unsigned transaction on Solana Devnet before requesting wallet approval…`);
      let simulation;
      try {
        simulation = await connection.simulateTransaction(transaction, [], false);
      } catch (simErr) {
        simulation = { value: { err: null, unitsConsumed: 0 } };
      }
      if (simulation.value && simulation.value.err) {
        console.warn('Simulation reported error; continuing to wallet for user review', simulation.value.err);
      }
      const computeUnits = Number.isFinite(simulation.value?.unitsConsumed) ? ` Estimated compute: ${simulation.value.unitsConsumed.toLocaleString()} units.` : '';
      setQuoteText(`${quoteSummary(activeQuote)}\n\nReady for wallet approval.${computeUnits} Review network, recipient, block count, and spend before approving.`);
      const signature = await window.walletManager.signAndSendTransaction(transaction, {
        preflightCommitment: 'confirmed'
      });
      if (!signature) throw new Error('The wallet did not return a transaction signature.');
      setQuoteText('Transaction submitted to Solana Devnet. Waiting for confirmation…');

      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: transactionData.blockhash,
        lastValidBlockHeight: transactionData.lastValidBlockHeight
      }, 'confirmed');
      if (confirmation.value.err) throw new Error('The Devnet transaction failed. No ownership was recorded.');

      const firstBlockResponse = await fetch(`/api/block-owner/${encodeURIComponent(transactionData.startBlock)}`);
      const ownership = await firstBlockResponse.json();
      if (!firstBlockResponse.ok || !ownership.verified || ownership.owner !== wallet.address) {
        throw new Error('Payment confirmed, but the ownership receipt could not yet be verified. Check the explorer link and reload shortly.');
      }
      const solAfter = await solBalance(connection, wallet.address);
      const assetAfter = await selectedBalance(connection, activeQuote.asset, wallet.address);
      balanceStatus.textContent = activeQuote.asset === 'SOL'
        ? `Devnet SOL balance: ${lamportsText(solBefore)} → ${lamportsText(solAfter)}. The decrease includes the block price, $0.10 platform fee, network fee, and account rent.`
        : `Devnet USDC balance: ${(Number(assetBefore) / 1_000_000).toFixed(6)} → ${(Number(assetAfter) / 1_000_000).toFixed(6)} USDC; Devnet SOL balance: ${lamportsText(solBefore)} → ${lamportsText(solAfter)} for network fees and any account rent.`;
      quoteOutput.textContent = `Purchase confirmed on Devnet. ${transactionData.blockCount.toLocaleString()} blocks beginning at ${activeQuote.firstLabel} are recorded for ${wallet.address}. Supply advanced — next blocks cost more on the linear curve. Platform fee: $0.10.`;
      explorerLink.href = `https://explorer.solana.com/tx/${encodeURIComponent(signature)}?cluster=devnet`;
      explorerLink.hidden = false;
      if (window.SpaceLedgerToast) {
        window.SpaceLedgerToast.show(
          '<strong>Purchase confirmed on Devnet.</strong><br>Supply advanced — the next block is priced higher on the linear curve.<br><a href="' +
          explorerLink.href + '" target="_blank" rel="noopener noreferrer">Open Explorer</a>',
          { ok: true, duration: 12000 }
        );
      }
      activeQuote = null;
      await loadConfig();
    } catch (error) {
      setQuoteText(error.message || 'The Devnet purchase did not complete.');
      if (window.SpaceLedgerToast) {
        window.SpaceLedgerToast.show(String(error.message || 'Purchase did not complete'), { error: true });
      }
    } finally {
      setBusy(false);
      await refreshWalletStatus();
    }
  });

  window.walletManager?.on('connected', refreshWalletStatus);
  window.walletManager?.on('disconnected', refreshWalletStatus);
  loadConfig();
}());
