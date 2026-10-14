(function () {
  const TOTAL = 10_000_000_000;
  const START = 0.001;
  const TARGET = 1000;

  function modelPrice(blockIndex) {
    const i = Math.max(0, Math.min(TOTAL - 1, Number(blockIndex) || 0));
    return START + (TARGET - START) * (i / TOTAL);
  }

  function rangeModelValueUsd(startBlock, blockCount) {
    const start = Number(startBlock);
    const n = Number(blockCount);
    if (!Number.isFinite(start) || !Number.isFinite(n) || n < 1) return 0;
    const end = start + n - 1;
    return ((modelPrice(start) + modelPrice(end)) / 2) * n;
  }

  function paidUsd(receipt) {
    const price = Number(receipt.priceMicroUsd || 0) / 1e6;
    const fee = Number(receipt.feeMicroUsd || 0) / 1e6;
    return price + fee;
  }

  function pnlForReceipt(receipt) {
    const paid = paidUsd(receipt);
    const current = rangeModelValueUsd(receipt.startBlock, receipt.blockCount);
    const pnl = current - paid;
    const pct = paid > 0 ? (pnl / paid) * 100 : 0;
    return { paid, current, pnl, pct };
  }

  async function loadPortfolio(address, opts = {}) {
    const holdingsEl = document.getElementById(opts.holdingsId || 'holdingsList');
    const statusEl = document.getElementById(opts.statusId || 'holdingsStatus');
    const historyEl = opts.historyId === null ? null : document.getElementById(opts.historyId || 'historyList');
    const historySection = opts.historySectionId === null ? null : document.getElementById(opts.historySectionId || 'purchaseHistory');
    const summaryEl = opts.summaryId ? document.getElementById(opts.summaryId) : null;

    if (statusEl) statusEl.textContent = 'Loading confirmed Devnet receipts…';
    try {
      const res = await fetch('/api/portfolio/' + encodeURIComponent(address));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load portfolio');

      const ranges = data.ranges || [];
      let totalPaid = 0;
      let totalCurrent = 0;

      if (holdingsEl) {
        if (!ranges.length) {
          holdingsEl.innerHTML = '<p class="estimate-note">No confirmed purchase receipts for this wallet yet.</p>';
        } else {
          const rows = ranges.map(r => {
            const p = pnlForReceipt(r);
            totalPaid += p.paid;
            totalCurrent += p.current;
            const sign = p.pct >= 0 ? '+' : '';
            return (
              '<tr>' +
              '<td>' + (r.startLabel || r.startBlock) + '–' + (r.endLabel || r.endBlock) + '</td>' +
              '<td>' + r.blockCount + '</td>' +
              '<td>' + (r.asset || '—') + '</td>' +
              '<td>$' + p.paid.toFixed(4) + '</td>' +
              '<td>$' + p.current.toFixed(4) + '</td>' +
              '<td>' + sign + p.pct.toFixed(2) + '%</td>' +
              '</tr>'
            );
          }).join('');
          holdingsEl.innerHTML =
            '<table class="table"><thead><tr>' +
            '<th>Blocks</th><th>Count</th><th>Asset</th><th>Paid (model)</th><th>Now (model)</th><th>PnL %</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table>' +
            '<p class="estimate-note">PnL % compares your recorded purchase USD (curve + fee) to the <strong>current primary-sale model</strong> for those blocks. Not a traded market price.</p>';
        }
      } else {
        ranges.forEach(r => {
          const p = pnlForReceipt(r);
          totalPaid += p.paid;
          totalCurrent += p.current;
        });
      }

      if (statusEl) {
        statusEl.textContent = ranges.length
          ? ('Verified: ' + data.blocksOwned + ' blocks across ' + data.purchaseCount + ' purchase(s).')
          : 'No verified holdings for this wallet.';
      }

      if (summaryEl) {
        const totalPnl = totalCurrent - totalPaid;
        const totalPct = totalPaid > 0 ? (totalPnl / totalPaid) * 100 : 0;
        const sign = totalPct >= 0 ? '+' : '';
        summaryEl.innerHTML =
          '<dl class="market-metrics">' +
          '<div><dt>Blocks owned</dt><dd>' + (data.blocksOwned || 0) + '</dd></div>' +
          '<div><dt>Purchases</dt><dd>' + (data.purchaseCount || 0) + '</dd></div>' +
          '<div><dt>Paid (model USD)</dt><dd>$' + totalPaid.toFixed(4) + '</dd></div>' +
          '<div><dt>Current model USD</dt><dd>$' + totalCurrent.toFixed(4) + '</dd></div>' +
          '<div><dt>Model PnL</dt><dd>' + sign + totalPct.toFixed(2) + '%</dd></div>' +
          '</dl>';
      }

      if (historyEl && historySection) {
        historySection.hidden = false;
        if (!ranges.length) {
          historyEl.innerHTML = '<p class="estimate-note">No purchase history yet.</p>';
        } else {
          const items = await Promise.all(ranges.map(async r => {
            let sigHtml = '';
            try {
              if (r.receipt) {
                const sRes = await fetch('/api/receipt/' + encodeURIComponent(r.receipt) + '/signatures');
                const sData = await sRes.json();
                const sig = (sData.signatures || [])[0];
                if (sig) {
                  sigHtml = '<a href="' + sig.explorerUrl + '" target="_blank" rel="noopener noreferrer">Explorer tx</a>';
                }
              }
            } catch (_) {}
            const when = r.settledAt ? new Date(r.settledAt * 1000).toISOString().replace('T', ' ').slice(0, 19) + ' UTC' : '—';
            return (
              '<article class="activity-item" style="margin-bottom:12px;padding:12px;border:1px solid #2a3d4a;border-radius:8px;">' +
              '<p><strong>' + (r.startLabel || r.startBlock) + '–' + (r.endLabel || r.endBlock) + '</strong> · ' + r.blockCount + ' blocks · ' + (r.asset || '') + '</p>' +
              '<p class="estimate-note">Settled: ' + when + (r.receipt ? ' · Receipt: ' + r.receipt.slice(0, 8) + '…' : '') + '</p>' +
              (sigHtml ? '<p>' + sigHtml + '</p>' : '') +
              '</article>'
            );
          }));
          historyEl.innerHTML = items.join('');
        }
      }
    } catch (error) {
      if (statusEl) statusEl.textContent = error.message || 'Could not load holdings.';
    }
  }

  window.SpaceLedgerPortfolio = { loadPortfolio, pnlForReceipt, rangeModelValueUsd };
})();
