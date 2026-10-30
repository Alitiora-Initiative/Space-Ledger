(() => {
  const priceEl = document.getElementById('slPrice');
  const changeEl = document.getElementById('slChange');
  const updatedEl = document.getElementById('slUpdated');
  const statusEl = document.getElementById('slStatus');
  const chartEl = document.getElementById('slChart');
  const chartNote = document.getElementById('slChartNote');
  const tradesBody = document.getElementById('slTrades');
  const sourcesEl = document.getElementById('slSources');
  const gradFill = document.getElementById('slGradFill');
  const gradLabel = document.getElementById('slGradLabel');
  const gradBar = document.getElementById('slGradBar');

  function text(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function usd(value, digits) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    if (number === 0) return '$0';
    if (number >= 1000) return '$' + number.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (number >= 1) return '$' + number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    const places = digits || 8;
    return '$' + number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: places });
  }

  function compact(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    return number.toLocaleString(undefined, { maximumFractionDigits: number >= 100 ? 2 : 4 });
  }

  function signedPercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    const sign = number > 0 ? '+' : '';
    return sign + number.toLocaleString(undefined, { maximumFractionDigits: 2 }) + '%';
  }

  function shortAddress(value) {
    if (!value || value.length < 12) return value || '—';
    return value.slice(0, 4) + '…' + value.slice(-4);
  }

  function ago(iso) {
    const time = Date.parse(iso);
    if (!Number.isFinite(time)) return '—';
    const seconds = Math.max(0, Math.round((Date.now() - time) / 1000));
    if (seconds < 60) return seconds + 's ago';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return minutes + 'm ago';
    const hours = Math.round(minutes / 60);
    if (hours < 48) return hours + 'h ago';
    return new Date(time).toLocaleString();
  }

  function setChange(value) {
    changeEl.textContent = signedPercent(value);
    changeEl.classList.remove('up', 'down');
    if (Number(value) > 0) changeEl.classList.add('up');
    if (Number(value) < 0) changeEl.classList.add('down');
  }

  function drawChart(candles, price) {
    const width = 640;
    const height = 220;
    const pad = { l: 8, r: 8, t: 16, b: 22 };
    const rows = Array.isArray(candles) ? candles.filter(row => Number.isFinite(row.c)) : [];
    chartEl.setAttribute('viewBox', `0 0 ${width} ${height}`);
    chartEl.replaceChildren();
    if (rows.length < 2) {
      chartNote.textContent = rows.length
        ? 'Only one candle so far. The line appears after the next trade interval.'
        : 'No candles yet. The chart fills from live GeckoTerminal candles as trades print.';
      return;
    }
    const values = rows.flatMap(row => [row.l, row.h, row.c]).filter(Number.isFinite);
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (min === max) {
      min *= 0.98;
      max *= 1.02;
    }
    const span = max - min || 1;
    const innerW = width - pad.l - pad.r;
    const innerH = height - pad.t - pad.b;
    const x = index => pad.l + (index / (rows.length - 1)) * innerW;
    const y = value => pad.t + (1 - (value - min) / span) * innerH;
    const line = rows.map((row, index) => `${x(index).toFixed(2)},${y(row.c).toFixed(2)}`).join(' ');
    const area = `${pad.l},${(pad.t + innerH).toFixed(2)} ${line} ${(pad.l + innerW).toFixed(2)},${(pad.t + innerH).toFixed(2)}`;
    const ns = 'http://www.w3.org/2000/svg';
    const grid = document.createElementNS(ns, 'path');
    grid.setAttribute('d', `M${pad.l} ${pad.t} H${width - pad.r} M${pad.l} ${pad.t + innerH / 2} H${width - pad.r} M${pad.l} ${pad.t + innerH} H${width - pad.r}`);
    grid.setAttribute('class', 'chart-grid');
    const fill = document.createElementNS(ns, 'polygon');
    fill.setAttribute('points', area);
    fill.setAttribute('class', 'chart-fill');
    const path = document.createElementNS(ns, 'polyline');
    path.setAttribute('points', line);
    path.setAttribute('class', 'chart-line');
    const last = rows[rows.length - 1];
    const dot = document.createElementNS(ns, 'circle');
    dot.setAttribute('cx', x(rows.length - 1).toFixed(2));
    dot.setAttribute('cy', y(last.c).toFixed(2));
    dot.setAttribute('r', '3.5');
    dot.setAttribute('class', 'chart-dot');
    chartEl.append(grid, fill, path, dot);
    const up = last.c >= rows[0].c;
    chartEl.dataset.trend = up ? 'up' : 'down';
    const start = new Date(rows[0].t * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const end = new Date(last.t * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    chartNote.textContent = `${rows.length} live 1-minute candles · ${start} → ${end} · last close ${usd(last.c)} · spot ${usd(price)}`;
  }

  function renderTrades(trades) {
    tradesBody.replaceChildren();
    if (!trades || !trades.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 5;
      cell.textContent = 'No indexed trades yet.';
      row.append(cell);
      tradesBody.append(row);
      return;
    }
    for (const trade of trades) {
      const row = document.createElement('tr');
      const cells = [
        ago(trade.time),
        trade.side === 'buy' ? 'Buy' : 'Sell',
        usd(trade.volumeUsd, 4),
        compact(trade.slAmount) + ' SL',
        shortAddress(trade.wallet),
      ];
      cells.forEach((value, index) => {
        const cell = document.createElement('td');
        if (index === 1) cell.className = trade.side === 'buy' ? 'up' : 'down';
        if (index === 4 && trade.explorerUrl) {
          const link = document.createElement('a');
          link.href = trade.explorerUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = value;
          cell.append(link);
        } else {
          cell.textContent = value;
        }
        row.append(cell);
      });
      tradesBody.append(row);
    }
  }

  function render(data) {
    text('slName', data.name || 'Space Ledger');
    text('slSymbol', '$' + (data.symbol || 'SL'));
    priceEl.textContent = usd(data.priceUsd);
    setChange(data.priceChangePercent?.h24);
    text('slMcap', usd(data.marketCapUsd, 2));
    text('slVolume', usd(data.volume24hUsd, 2));
    text('slLiquidity', usd(data.reportedLiquidityUsd, 4));
    text('slReserve', usd(data.curveReserveUsd, 2));
    text('slPeak', usd(data.peakMarketCapUsd, 2));
    const tx = data.transactions24h;
    text('slTx', tx ? `${tx.buys} buys · ${tx.sells} sells` : '—');
    text('slPair', (data.pair?.symbol || 'STONK') + ' pair');
    text('slSupply', Number(data.supply || 0).toLocaleString());
    text('slCreator', data.creator || '—');
    text('slPool', data.pool || '—');
    text('slMint', data.mint);
    text('slBorn', data.createdAt ? new Date(data.createdAt).toLocaleString() : '—');
    const progress = Number(data.graduationProgress);
    const pct = Number.isFinite(progress) ? Math.max(0, Math.min(100, progress * 100)) : 0;
    gradFill.style.width = (progress > 0 && pct < 1.2 ? 1.2 : pct) + '%';
    gradLabel.textContent = Number.isFinite(progress) ? pct.toFixed(4) + '%' : '—';
    gradBar.setAttribute('aria-valuenow', String(Math.round(pct)));
    const bits = data.sources || {};
    sourcesEl.textContent = Object.keys(bits).map(key => key + ': ' + bits[key]).join(' · ');
    updatedEl.textContent = 'Live update ' + (data.fetchedAt ? new Date(data.fetchedAt).toLocaleTimeString() : 'now');
    statusEl.textContent = data.status ? ('Curve status: ' + data.status) : 'Live market';
    drawChart(data.candles, data.priceUsd);
    renderTrades(data.trades);
    const logo = document.getElementById('slLogo');
    if (logo && data.imageUrl && logo.getAttribute('src') !== data.imageUrl) logo.src = data.imageUrl;
  }

  async function refresh() {
    try {
      const response = await fetch('/api/token/sl', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.live) throw new Error(data.error || 'Market data unavailable.');
      render(data);
    } catch (error) {
      updatedEl.textContent = error.message || 'Could not reach live market data.';
      statusEl.textContent = 'Feed interrupted';
    }
  }

  document.getElementById('slCopy')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    const mint = document.getElementById('slMint')?.textContent?.trim() || '';
    try {
      await navigator.clipboard.writeText(mint);
      button.textContent = 'Copied';
    } catch (_) {
      button.textContent = 'Copy failed';
    }
    setTimeout(() => { button.textContent = 'Copy mint'; }, 1400);
  });

  refresh();
  setInterval(refresh, 15000);
})();
