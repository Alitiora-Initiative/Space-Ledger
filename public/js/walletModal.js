/**
 * walletModal.js — Wallet selector modal
 * Icons served as static SVG files from /img/wallets/.
 * No base64, no CDN, no CORS — always renders.
 */
(function () {

  // ── Wallet definitions ────────────────────────────────────────────────────
  var WALLETS = [
    {
      id:   'phantom',
      name: 'Phantom',
      type: 'SOLANA',
      detect:  function () { return typeof window.solana !== 'undefined' && !!window.solana.isPhantom; },
      connect: function () { return walletManager.connectPhantom(); },
      url:     'https://phantom.app/'
    },
    {
      id:   'metamask',
      name: 'MetaMask',
      type: 'EVM',
      detect:  function () {
        return typeof window.ethereum !== 'undefined'
          && !!window.ethereum.isMetaMask
          && !window.ethereum.isBraveWallet;
      },
      connect: function () { return walletManager.connectMetaMask(); },
      url:     'https://metamask.io/download/'
    },
    {
      id:   'coinbase',
      name: 'Coinbase Wallet',
      type: 'EVM',
      detect:  function () { return typeof window.ethereum !== 'undefined' && !!window.ethereum.isCoinbaseWallet; },
      connect: function () { return walletManager.connectMetaMask(); },
      url:     'https://www.coinbase.com/wallet'
    },
    {
      id:   'brave',
      name: 'Brave Wallet',
      type: 'EVM',
      detect:  function () { return typeof window.ethereum !== 'undefined' && !!window.ethereum.isBraveWallet; },
      connect: function () { return walletManager.connectMetaMask(); },
      url:     'https://brave.com/wallet/'
    },
    {
      id:   'solflare',
      name: 'Solflare',
      type: 'SOLANA',
      detect:  function () { return typeof window.solflare !== 'undefined' && !!window.solflare.isSolflare; },
      connect: function () {
        return window.solflare.connect().then(function (r) {
          var a = r.publicKey.toString();
          walletManager.currentWallet = 'solflare';
          walletManager.currentAddress = a;
          walletManager.connected = true;
          walletManager.emit('connected', { wallet: 'solflare', address: a });
          return { success: true, wallet: 'Solflare', address: a };
        });
      },
      url: 'https://solflare.com/'
    },
    {
      id:   'backpack',
      name: 'Backpack',
      type: 'SOLANA',
      detect:  function () { return typeof window.xnft !== 'undefined' || typeof window.backpack !== 'undefined'; },
      connect: function () {
        var bp = window.backpack || (window.xnft && window.xnft.solana);
        return bp.connect().then(function (r) {
          var a = r.publicKey.toString();
          walletManager.currentWallet = 'backpack';
          walletManager.currentAddress = a;
          walletManager.connected = true;
          walletManager.emit('connected', { wallet: 'backpack', address: a });
          return { success: true, wallet: 'Backpack', address: a };
        });
      },
      url: 'https://www.backpack.app/'
    },
    {
      id:   'okx',
      name: 'OKX Wallet',
      type: 'EVM',
      detect:  function () { return typeof window.okxwallet !== 'undefined'; },
      connect: function () {
        return window.okxwallet.request({ method: 'eth_requestAccounts' }).then(function (acc) {
          var a = acc[0];
          walletManager.currentWallet = 'okx';
          walletManager.currentAddress = a;
          walletManager.connected = true;
          walletManager.emit('connected', { wallet: 'okx', address: a });
          return { success: true, wallet: 'OKX', address: a };
        });
      },
      url: 'https://www.okx.com/web3'
    },
    {
      id:   'trust',
      name: 'Trust Wallet',
      type: 'EVM',
      detect:  function () {
        return typeof window.trustwallet !== 'undefined'
          || (typeof window.ethereum !== 'undefined' && !!window.ethereum.isTrust);
      },
      connect: function () { return walletManager.connectMetaMask(); },
      url:     'https://trustwallet.com/'
    },
    {
      id:   'rabby',
      name: 'Rabby',
      type: 'EVM',
      detect:  function () { return typeof window.ethereum !== 'undefined' && !!window.ethereum.isRabby; },
      connect: function () { return walletManager.connectMetaMask(); },
      url:     'https://rabby.io/'
    }
  ];

  // Fallback colours shown while SVG loads or if it errors
  var FALLBACK_COLOR = {
    phantom:  '#4e44ce', metamask: '#e8831a', coinbase: '#0052ff',
    brave:    '#fb542b', solflare: '#fc8c00', backpack: '#e33d3d',
    okx:      '#111111', trust:    '#3375bb', rabby:    '#7084ff'
  };

  // ── Inject styles ─────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('wm-styles')) return;
    var s = document.createElement('style');
    s.id = 'wm-styles';
    s.textContent =
      '@keyframes wmFade{from{opacity:0}to{opacity:1}}' +
      '@keyframes wmUp{from{opacity:0;transform:translateY(18px) scale(.96)}to{opacity:1;transform:none}}' +

      '#wm-overlay{display:none;position:fixed;inset:0;z-index:99999;' +
        'background:rgba(0,0,0,.85);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);' +
        'align-items:center;justify-content:center;padding:16px;}' +
      '#wm-overlay.wm-open{display:flex;animation:wmFade .15s ease;}' +

      '#wm-box{background:#08080f;border:1px solid rgba(0,212,255,.18);border-radius:22px;' +
        'width:100%;max-width:400px;overflow:hidden;' +
        'box-shadow:0 32px 80px rgba(0,0,0,.75),0 0 0 1px rgba(0,212,255,.04),0 0 60px rgba(0,212,255,.05);' +
        'animation:wmUp .22s cubic-bezier(.22,1,.36,1);}' +

      /* Header */
      '#wm-hdr{display:flex;align-items:center;gap:12px;padding:18px 18px 14px;' +
        'border-bottom:1px solid rgba(255,255,255,.05);}' +
      '#wm-app-logo{width:38px;height:38px;border-radius:9px;object-fit:cover;flex-shrink:0;' +
        'box-shadow:0 0 12px rgba(0,212,255,.3);}' +
      '#wm-app-title{flex:1;}' +
      '#wm-app-title strong{display:block;font-size:.95em;font-weight:700;letter-spacing:.01em;' +
        'background:linear-gradient(90deg,#00d4ff,#7b2fff);' +
        '-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}' +
      '#wm-app-title small{font-size:.68em;color:#333;letter-spacing:.04em;}' +
      '#wm-close{background:none;border:none;color:#383858;font-size:1.1em;cursor:pointer;' +
        'padding:3px 8px;border-radius:6px;transition:color .15s,background .15s;line-height:1;margin-left:4px;}' +
      '#wm-close:hover{color:#aaa;background:rgba(255,255,255,.07);}' +

      '#wm-sub{padding:10px 18px 2px;font-size:.72em;color:#2a2a4a;letter-spacing:.02em;}' +

      /* List */
      '#wm-list{display:flex;flex-direction:column;gap:2px;max-height:370px;overflow-y:auto;padding:8px 10px 14px;}' +
      '#wm-list::-webkit-scrollbar{width:3px;}' +
      '#wm-list::-webkit-scrollbar-thumb{background:rgba(0,212,255,.18);border-radius:2px;}' +

      /* Row */
      '.wm-row{display:flex;align-items:center;gap:13px;padding:10px 12px;' +
        'border-radius:12px;border:1px solid transparent;background:transparent;' +
        'cursor:pointer;text-align:left;font-family:inherit;color:#d0d0d0;width:100%;' +
        'transition:background .12s,border-color .12s,transform .1s;}' +
      '.wm-row:hover{background:rgba(0,212,255,.055);border-color:rgba(0,212,255,.22);transform:translateX(2px);}' +
      '.wm-row:active{transform:none;background:rgba(0,212,255,.1);}' +
      '.wm-on{border-color:rgba(255,255,255,.04);}' +
      '.wm-off{opacity:.32;}.wm-off:hover{opacity:.6;}' +
      '.wm-busy{opacity:.45;pointer-events:none;}' +

      /* Icon wrapper — coloured bg shows while SVG loads */
      '.wm-icon-wrap{width:40px;height:40px;border-radius:11px;flex-shrink:0;' +
        'display:flex;align-items:center;justify-content:center;overflow:hidden;}' +
      '.wm-icon-wrap img{width:40px;height:40px;border-radius:11px;object-fit:cover;display:block;}' +

      '.wm-info{flex:1;min-width:0;}' +
      '.wm-name{font-weight:600;font-size:.88em;color:#e0e0e0;white-space:nowrap;}' +
      '.wm-chain{font-size:.6em;font-weight:700;color:#252540;letter-spacing:.07em;margin-top:1px;}' +

      '.wm-badge{font-size:.63em;font-weight:700;padding:2px 9px;border-radius:20px;flex-shrink:0;}' +
      '.wm-yes{background:rgba(0,255,136,.08);color:#00ff88;border:1px solid rgba(0,255,136,.22);}' +
      '.wm-no{background:rgba(255,255,255,.03);color:#1e1e38;border:1px solid rgba(255,255,255,.06);}' +

      /* Status */
      '#wm-status{padding:6px 18px 16px;min-height:22px;font-size:.82em;text-align:center;}' +
      '.wm-pending{color:#ffa502;}.wm-ok{color:#00ff88;}.wm-err{color:#ff4757;}';
    document.head.appendChild(s);
  }

  // ── Build modal DOM ───────────────────────────────────────────────────────
  function buildModal() {
    if (document.getElementById('wm-overlay')) return;
    injectStyles();

    var ov = document.createElement('div');
    ov.id = 'wm-overlay';
    ov.innerHTML =
      '<div id="wm-box">' +
        '<div id="wm-hdr">' +
          '<img id="wm-app-logo" src="/img/logo.jpg" alt="SLP" onerror="this.style.display=\'none\'">' +
          '<div id="wm-app-title">' +
            '<strong>Spatial Ledger Protocol</strong>' +
            '<small>SELECT WALLET</small>' +
          '</div>' +
          '<button id="wm-close" aria-label="Close">&#10005;</button>' +
        '</div>' +
        '<div id="wm-sub">Detected wallets are highlighted. Click others to install.</div>' +
        '<div id="wm-list"></div>' +
        '<div id="wm-status"></div>' +
      '</div>';

    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov) closeModal(); });
    document.getElementById('wm-close').addEventListener('click', closeModal);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  }

  // ── Populate wallet rows ──────────────────────────────────────────────────
  function populateList() {
    var list = document.getElementById('wm-list');
    list.innerHTML = '';

    // Detected wallets first, rest alphabetical
    var sorted = WALLETS.slice().sort(function (a, b) {
      var da = a.detect() ? 0 : 1, db = b.detect() ? 0 : 1;
      return da !== db ? da - db : a.name.localeCompare(b.name);
    });

    sorted.forEach(function (w) {
      var on  = w.detect();
      var row = document.createElement('button');
      row.className = 'wm-row ' + (on ? 'wm-on' : 'wm-off');

      // Icon — static SVG file, coloured background while loading
      var iconWrap = document.createElement('div');
      iconWrap.className  = 'wm-icon-wrap';
      iconWrap.style.background = FALLBACK_COLOR[w.id] || '#1a1a2e';
      var img = document.createElement('img');
      img.src = '/img/wallets/' + w.id + '.svg';
      img.alt = w.name;
      img.onerror = function () { this.style.display = 'none'; };
      iconWrap.appendChild(img);
      row.appendChild(iconWrap);

      // Info
      var info  = document.createElement('div'); info.className = 'wm-info';
      var nm    = document.createElement('div'); nm.className   = 'wm-name';  nm.textContent = w.name;
      var chain = document.createElement('div'); chain.className = 'wm-chain'; chain.textContent = w.type;
      info.appendChild(nm); info.appendChild(chain);
      row.appendChild(info);

      // Badge
      var badge = document.createElement('span');
      badge.className   = 'wm-badge ' + (on ? 'wm-yes' : 'wm-no');
      badge.textContent = on ? 'Detected' : 'Install';
      row.appendChild(badge);

      row.addEventListener('click', function () {
        if (on) doConnect(w, row);
        else    window.open(w.url, '_blank', 'noopener,noreferrer');
      });

      list.appendChild(row);
    });
  }

  // ── Connect ───────────────────────────────────────────────────────────────
  function doConnect(w, row) {
    var status = document.getElementById('wm-status');
    row.classList.add('wm-busy');
    status.className   = 'wm-pending';
    status.textContent = 'Opening ' + w.name + '\u2026';

    w.connect()
      .then(function (r) {
        status.className   = 'wm-ok';
        status.textContent = '\u2713 ' + r.address.slice(0,6) + '\u2026' + r.address.slice(-4);
        updateNavButtons(r.address);
        localStorage.setItem('spaceledger_last_wallet', w.id);
        setTimeout(closeModal, 600);
      })
      .catch(function (err) {
        row.classList.remove('wm-busy');
        status.className   = 'wm-err';
        status.textContent = err.message || 'Connection rejected';
      });
  }

  // ── Update every nav wallet button ────────────────────────────────────────
  function updateNavButtons(address) {
    var short = address.slice(0,6) + '\u2026' + address.slice(-4);
    document.querySelectorAll('.wallet-button, #navWalletBtn').forEach(function (btn) {
      btn.textContent = short;
      btn.style.background = 'linear-gradient(90deg,#00ff88,#00d4ff)';
      btn.setAttribute('data-wallet-connected', 'true');
    });
  }

  // ── Open / close ──────────────────────────────────────────────────────────
  function openModal() {
    buildModal();
    populateList();
    document.getElementById('wm-overlay').classList.add('wm-open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    var ov = document.getElementById('wm-overlay');
    if (!ov) return;
    ov.classList.remove('wm-open');
    document.body.style.overflow = '';
    setTimeout(function () {
      var s = document.getElementById('wm-status');
      if (s) { s.textContent = ''; s.className = ''; }
      document.querySelectorAll('.wm-busy').forEach(function (r) { r.classList.remove('wm-busy'); });
    }, 250);
  }

  // ── Silent auto-reconnect ─────────────────────────────────────────────────
  function autoReconnect() {
    var lastId = localStorage.getItem('spaceledger_last_wallet');
    if (!lastId) return;
    var w = WALLETS.find(function (x) { return x.id === lastId; });
    if (!w || !w.detect()) return;
    try {
      if (lastId === 'phantom' && window.solana && window.solana.isConnected && window.solana.publicKey) {
        var a = window.solana.publicKey.toString();
        walletManager.currentWallet = 'phantom'; walletManager.currentAddress = a; walletManager.connected = true;
        walletManager.emit('connected', { wallet: 'phantom', address: a });
        updateNavButtons(a);
      } else if (window.ethereum) {
        window.ethereum.request({ method: 'eth_accounts' }).then(function (acc) {
          if (acc && acc[0]) {
            walletManager.currentWallet = lastId; walletManager.currentAddress = acc[0]; walletManager.connected = true;
            walletManager.emit('connected', { wallet: lastId, address: acc[0] });
            updateNavButtons(acc[0]);
          }
        }).catch(function () {});
      }
    } catch (_) {}
  }

  // ── Intercept wallet button clicks (capture phase) ────────────────────────
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.wallet-button, #navWalletBtn');
    if (btn && !btn.getAttribute('data-wallet-connected')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      openModal();
    }
  }, true);

  window.openWalletModal  = openModal;
  window.closeWalletModal = closeModal;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoReconnect);
  } else {
    autoReconnect();
  }

}());
