'use strict';

(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SpaceLedgerTxRecovery = api;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  const STORAGE_VERSION = 2;

  function isValidRecord(record) {
    if (!record || record.network !== 'devnet'
      || typeof record.blockhash !== 'string' || record.blockhash.length < 32 || record.blockhash.length > 64
      || typeof record.buyer !== 'string' || record.buyer.length < 32 || record.buyer.length > 44
      || !/^\d+$/.test(record.startBlock)
      || !Number.isSafeInteger(record.blockCount) || record.blockCount < 1
      || !['SOL', 'USDC'].includes(record.asset)
      || !Number.isSafeInteger(record.lastValidBlockHeight) || record.lastValidBlockHeight < 0
      || !Number.isSafeInteger(record.submittedAt) || record.submittedAt < 1) return false;
    const signatureValid = typeof record.signature === 'string'
      && record.signature.length >= 32 && record.signature.length <= 128
      && /^[1-9A-HJ-NP-Za-km-z]+$/.test(record.signature);
    if (record.version === 1) return signatureValid;
    if (record.version !== STORAGE_VERSION) return false;
    if (record.stage === 'awaiting_wallet') return record.signature === null;
    return ['submitted', 'unknown'].includes(record.stage) && signatureValid;
  }

  function createPendingTransactionStore(storage, key) {
    const storageKey = key || 'space-ledger:devnet:pending-purchase:v1';

    function load() {
      if (!storage || typeof storage.getItem !== 'function') return null;
      try {
        const value = storage.getItem(storageKey);
        if (!value) return null;
        const parsed = JSON.parse(value);
        if (isValidRecord(parsed)) return parsed;
        if (typeof storage.removeItem === 'function') storage.removeItem(storageKey);
      } catch (_) {
        try { storage.removeItem(storageKey); } catch (_) { /* storage may be unavailable */ }
      }
      return null;
    }

    function save(record) {
      if (!storage || typeof storage.setItem !== 'function') return false;
      const normalized = {
        version: record?.version,
        network: record?.network,
        stage: record?.stage,
        signature: record?.signature,
        blockhash: record?.blockhash,
        lastValidBlockHeight: record?.lastValidBlockHeight,
        buyer: record?.buyer,
        startBlock: record?.startBlock,
        blockCount: record?.blockCount,
        asset: record?.asset,
        submittedAt: record?.submittedAt
      };
      if (!isValidRecord(normalized)) return false;
      try {
        storage.setItem(storageKey, JSON.stringify(normalized));
        return true;
      } catch (_) {
        return false;
      }
    }

    function clear(signature) {
      if (!storage || typeof storage.removeItem !== 'function') return false;
      const current = load();
      if (!current || (signature && current.signature !== signature)) return false;
      try {
        storage.removeItem(storageKey);
        return true;
      } catch (_) {
        return false;
      }
    }

    return Object.freeze({ load, save, clear });
  }

  function classifySignatureStatus(status, currentBlockHeight, lastValidBlockHeight) {
    if (status && status.err) return 'failed';
    if (status && (
      status.confirmationStatus === 'confirmed'
      || status.confirmationStatus === 'finalized'
      || status.confirmations === null
    )) return 'confirmed';
    if (status) return 'pending';
    if (Number.isSafeInteger(currentBlockHeight)
      && Number.isSafeInteger(lastValidBlockHeight)
      && currentBlockHeight > lastValidBlockHeight) return 'expired';
    return 'unknown';
  }

  function classifyUnsignedIntent({ currentBlockHeight, lastValidBlockHeight, currentSupply, startBlock, receiptVerified }) {
    if (receiptVerified) return 'confirmed';
    if (!Number.isSafeInteger(currentBlockHeight) || !Number.isSafeInteger(lastValidBlockHeight)) return 'unknown';
    if (currentBlockHeight <= lastValidBlockHeight) return 'pending';
    try {
      return BigInt(currentSupply) === BigInt(startBlock) ? 'expired' : 'unknown';
    } catch (_) {
      return 'unknown';
    }
  }

  function isUserRejected(error) {
    if (!error || typeof error !== 'object') return false;
    if (Number(error.code) === 4001) return true;
    return /user (?:rejected|denied|declined) (?:the )?request/i.test(String(error.message || ''));
  }

  function formatSimulationFailure(simulation) {
    const value = simulation && simulation.value;
    if (!value || !Object.prototype.hasOwnProperty.call(value, 'err')) {
      return 'Devnet RPC returned an invalid simulation response; no wallet approval was requested.';
    }
    if (value.err === null) return null;
    let errorText;
    try { errorText = JSON.stringify(value.err); } catch (_) { errorText = String(value.err); }
    const logs = Array.isArray(value.logs)
      ? value.logs.filter(line => typeof line === 'string').slice(-8).join('\n')
      : '';
    return ('Transaction preflight was rejected by the Devnet RPC: ' + errorText
      + (logs ? '\nProgram logs:\n' + logs : '')).slice(0, 2400);
  }

  return Object.freeze({
    createPendingTransactionStore,
    classifySignatureStatus,
    classifyUnsignedIntent,
    isUserRejected,
    formatSimulationFailure,
    isValidRecord
  });
}));
