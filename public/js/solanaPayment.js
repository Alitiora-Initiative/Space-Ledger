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
    buyButton.disabled = value || !activeQuote || window.walletManager?.getWalletInfo().wallet !== 'phantom';
    quoteButton.textContent = value ? 'Please wait…' : 'Get Devnet quote';
    buyButton.textContent = value ? 'Waiting for Phantom…' : (activeQuote ? 'Review and buy in Phantom' : 'Connect Phantom to buy');
  };

  function quoteSummary(quote) {
    const lines = [
      `${quote.blockCount.toLocaleString()} blocks: ${quote.firstLabel}–${quote.lastLabel}`,
      `Block price: $${(Number(quote.priceMicroUsd) / 1_000_000).toFixed(6)}`,
      `Test platform fee: $${(Number(quote.feeMicroUsd) / 1_000_000).toFixed(2)}`,
      `Charged by the program: ${quote.paymentAmount}; your selected budget is the maximum spend`,
      quote.asset === 'SOL' ? `Pyth SOL/USD: $${quote.solUsd.toFixed(2)}` : `Devnet USDC mint: ${appConfig.usdcMint}`,
      `Recipient: ${appConfig.treasury}`,
      'Plus Solana network fee and, if needed, token-account rent. Devnet tokens have no real-world value.'
    ];
    return lines.join('\n');
  }

  async function refreshWalletStatus() {
    const wallet = window.walletManager?.getWalletInfo();
    if (!wallet?.connected) {
      buyButton.disabled = busy || !activeQuote;
      return;
    }
    if (wallet.wallet === 'phantom') {
      buyButton.disabled = busy || !activeQuote;
      setStatus(`Devnet program ready. Phantom connected: ${wallet.address}. Review every amount in Phantom before approving.`);
      if (appConfig && window.solanaWeb3?.Connection) {
        try {
          const connection = new window.solanaWeb3.Connection(appConfig.rpc, 'confirmed');
          const balance = await solBalance(connection, wallet.address);
          balanceStatus.textContent = `Connected wallet Devnet SOL balance: ${lamportsText(balance)}. This is the buyer wallet; payments go to ${appConfig.treasury}.`;
        } catch (_) {
          balanceStatus.textContent = 'Could not load the connected wallet’s Devnet balance. Check the RPC connection.';
        }
      }
    } else {
      buyButton.disabled = true;
      setStatus('Solana block purchases require Phantom. Your currently connected wallet is for another network.');
      balanceStatus.textContent = 'Connect Phantom to display your Devnet balance.';
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
        ? 'Devnet ownership program is live. Select a test-token budget and request a fresh quote.'
        : 'The Devnet program is deployed. Its first approved purchase will initialize the ledger and record ownership.');
      await refreshWalletStatus();
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
    if (!window.walletManager?.isConnected() || window.walletManager.getWalletInfo().wallet !== 'phantom') {
      try {
        await window.walletManager.connectPhantom();
      } catch (error) {
        setQuoteText(error.message);
        return;
      }
    }

    setBusy(true);
    try {
      if (!window.solanaWeb3?.Transaction || !window.walletManager?.provider?.signAndSendTransaction) {
        throw new Error('Phantom transaction support is required for a Devnet purchase.');
      }
      const wallet = window.walletManager.getWalletInfo();
      const response = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          buyer: wallet.address,
          asset: activeQuote.asset,
          blockCount: activeQuote.blockCount,
          budget: activeQuote.budgetUnits
        })
      });
      const transactionData = await response.json();
      if (!response.ok) throw new Error(transactionData.error || 'Could not prepare the Devnet transaction. Request a fresh quote.');
      const binary = Uint8Array.from(atob(transactionData.transaction), character => character.charCodeAt(0));
      const transaction = window.solanaWeb3.Transaction.from(binary);
      const connection = new window.solanaWeb3.Connection(appConfig.rpc, 'confirmed');
      const solBefore = await solBalance(connection, wallet.address);
      const assetBefore = await selectedBalance(connection, activeQuote.asset, wallet.address);
      setQuoteText(`${quoteSummary(activeQuote)}\n\nPhantom will show the transaction for your review. Approve only if the network, recipient, block count, and spend are correct.`);
      const responseFromWallet = await window.walletManager.provider.signAndSendTransaction(transaction, {
        preflightCommitment: 'confirmed'
      });
      const signature = typeof responseFromWallet === 'string'
        ? responseFromWallet
        : responseFromWallet?.signature;
      if (!signature) throw new Error('Phantom did not return a transaction signature.');
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
      quoteOutput.textContent = `Purchase confirmed on Devnet. ${transactionData.blockCount.toLocaleString()} blocks beginning at ${activeQuote.firstLabel} are recorded for ${wallet.address}. Platform fee: $0.10. Network fee and any account rent are separate.`;
      explorerLink.href = `https://explorer.solana.com/tx/${encodeURIComponent(signature)}?cluster=devnet`;
      explorerLink.hidden = false;
      activeQuote = null;
      await loadConfig();
    } catch (error) {
      setQuoteText(error.message || 'The Devnet purchase did not complete.');
    } finally {
      setBusy(false);
      await refreshWalletStatus();
    }
  });

  window.walletManager?.on('connected', refreshWalletStatus);
  window.walletManager?.on('disconnected', refreshWalletStatus);
  loadConfig();
}());
