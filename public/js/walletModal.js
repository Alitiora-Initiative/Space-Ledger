/**
 * walletModal.js — Wallet selector modal
 * Icons: inline base64 SVG — no CDN, no CORS, renders in every browser guaranteed.
 */
(function () {

  // ── Inline SVG icons (base64 encoded, self-contained) ─────────────────────
  var ICONS = {
    phantom: 'data:image/svg+xml;base64,' + btoa([
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">',
      '<rect width="128" height="128" rx="20" fill="#4e44ce"/>',
      '<path fill="#fff" d="M110 58.5C110 36 91.5 18 68.5 18h-9C36.7 18 18 36.7 18 59.5v1C18 83.8 36.7 102 59.5 102h1.2a8 8 0 0 0 7.3-4.8l1-2.3a30.2 30.2 0 0 0 41-28.4z"/>',
      '<ellipse cx="80" cy="60" rx="6" ry="8" fill="#4e44ce"/>',
      '<ellipse cx="96" cy="60" rx="6" ry="8" fill="#4e44ce"/>',
      '</svg>'
    ].join('')),

    metamask: 'data:image/svg+xml;base64,' + btoa([
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">',
      '<rect width="128" height="128" rx="20" fill="#1a1a1a"/>',
      '<polygon points="104,16 64,46 71,30" fill="#e2761b" stroke="#e2761b" stroke-linejoin="round"/>',
      '<polygon points="24,16 63.5,46.3 57,30" fill="#e4761b" stroke="#e4761b" stroke-linejoin="round"/>',
      '<polygon points="89,84 78,101 102,107 108,84" fill="#e4761b" stroke="#e4761b" stroke-linejoin="round"/>',
      '<polygon points="20,84 26,107 50,101 39,84" fill="#e4761b" stroke="#e4761b" stroke-linejoin="round"/>',
      '<polygon points="49,57 43,66 67,67 66,41" fill="#e4761b" stroke="#e4761b" stroke-linejoin="round"/>',
      '<polygon points="79,57 62,41 67,67 85,66" fill="#d7c1b3" stroke="#d7c1b3" stroke-linejoin="round"/>',
      '<polygon points="50,101 65,94 52,85" fill="#e4761b" stroke="#e4761b" stroke-linejoin="round"/>',
      '<polygon points="63,94 78,101 76,85" fill="#e4761b" stroke="#e4761b" stroke-linejoin="round"/>',
      '</svg>'
    ].join('')),

    coinbase: 'data:image/svg+xml;base64,' + btoa([
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">',
      '<rect width="128" height="128" rx="20" fill="#0052ff"/>',
      '<circle cx="64" cy="64" r="38" fill="#fff"/>',
      '<rect x="48" y="52" width="32" height="24" rx="6" fill="#0052ff"/>',
      '</svg>'
    ].join('')),

    brave: 'data:image/svg+xml;base64,' + btoa([
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">',
      '<rect width="128" height="128" rx="20" fill="#fb542b"/>',
      '<path fill="#fff" d="M64 18 L98 50 L90 88 L64 102 L38 88 L30 50 Z"/>',
      '<path fill="#fb542b" d="M64 34 L82 52 L76 78 L64 86 L52 78 L46 52 Z"/>',
      '<circle cx="64" cy="62" r="10" fill="#fff"/>',
      '</svg>'
    ].join('')),

    solflare: 'data:image/svg+xml;base64,' + btoa([
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">',
      '<rect width="128" height="128" rx="20" fill="#fc8c00"/>',
      '<path fill="#fff" d="M64 20 L100 90 H28 Z"/>',
      '<path fill="#fc8c00" d="M64 42 L84 78 H44 Z"/>',
      '</svg>'
    ].join('')),

    backpack: 'data:image/svg+xml;base64,' + btoa([
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">',
      '<rect width="128" height="128" rx="20" fill="#e33d3d"/>',
      '<rect x="38" y="46" width="52" height="52" rx="10" fill="#fff"/>',
      '<rect x="50" y="30" width="28" height="24" rx="8" fill="#fff"/>',
      '<rect x="58" y="62" width="12" height="18" rx="3" fill="#e33d3d"/>',
      '<rect x="50" y="68" width="28" height="6" rx="3" fill="#e33d3d"/>',
      '</svg>'
    ].join('')),

    okx: 'data:image/svg+xml;base64,' + btoa([
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">',
      '<rect width="128" height="128" rx="20" fill="#000"/>',
      '<rect x="22" y="22" width="30" height="30" rx="4" fill="#fff"/>',
      '<rect x="76" y="22" width="30" height="30" rx="4" fill="#fff"/>',
      '<rect x="49" y="49" width="30" height="30" rx="4" fill="#fff"/>',
      '<rect x="22" y="76" width="30" height="30" rx="4" fill="#fff"/>',
      '<rect x="76" y="76" width="30" height="30" rx="4" fill="#fff"/>',
      '</svg>'
    ].join('')),

    trust: 'data:image/svg+xml;base64,' + btoa([
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">',
      '<rect width="128" height="128" rx="20" fill="#3375bb"/>',
      '<path fill="#fff" d="M64 18 L100 36 L100 68 C100 92 64 110 64 110 C64 110 28 92 28 68 L28 36 Z"/>',
      '<path fill="#3375bb" d="M64 32 L88 44 L88 68 C88 84 64 96 64 96 C64 96 40 84 40 68 L40 44 Z"/>',
      '<path fill="#fff" d="M55 62 L61 68 L75 54" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none"/>',
      '</svg>'
    ].join('')),

    rabby: 'data:image/svg+xml;base64,' + btoa([
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">',
      '<rect width="128" height="128" rx="20" fill="#7084ff"/>',
      '<ellipse cx="64" cy="72" rx="30" ry="26" fill="#fff"/>',
      '<circle cx="48" cy="44" rx="12" ry="18" fill="#fff"/>',
      '<circle cx="80" cy="44" rx="12" ry="18" fill="#fff"/>',
      '<circle cx="57" cy="68" r="5" fill="#7084ff"/>',
      '<circle cx="71" cy="68" r="5" fill="#7084ff"/>',
      '<path d="M57 80 Q64 86 71 80" stroke="#7084ff" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
      '</svg>'
    ].join(''))
  };

  // ── Wallet definitions ────────────────────────────────────────────────────
  var WALLETS = [
    {
      id:   'phantom',   name: 'Phantom',        type: 'SOLANA',
      detect:  function () { return typeof window.solana !== 'undefined' && !!window.solana.isPhantom; },
      connect: function () { return walletManager.connectPhantom(); },
      url: 'https://phantom.app/'
    },
    {
      id:   'metamask',  name: 'MetaMask',        type: 'EVM',
      detect:  function () { return typeof window.ethereum !== 'undefined' && !!window.ethereum.isMetaMask && !window.ethereum.isBraveWallet; },
      connect: function () { return walletManager.connectMetaMask(); },
      url: 'https://metamask.io/download/'
    },
    {
      id:   'coinbase',  name: 'Coinbase Wallet', type: 'EVM',
      detect:  function () { return typeof window.ethereum !== 'undefined' && !!window.ethereum.isCoinbaseWallet; },
      connect: function () { return walletManager.connectMetaMask(); },
      url: 'https://www.coinbase.com/wallet'
    },
    {
      id:   'brave',     name: 'Brave Wallet',    type: 'EVM',
      detect:  function () { return typeof window.ethereum !== 'undefined' && !!window.ethereum.isBraveWallet; },
      connect: function () { return walletManager.connectMetaMask(); },
      url: 'https://brave.com/wallet/'
    },
    {
      id:   'solflare',  name: 'Solflare',         type: 'SOLANA',
      detect:  function () { return typeof window.solflare !== 'undefined' && !!window.solflare.isSolflare; },
      connect: function () {
        return window.solflare.connect().then(function (r) {
          var a = r.publicKey.toString();
          walletManager.currentWallet  = 'solflare';
          walletManager.currentAddress = a;
          walletManager.connected      = true;
          walletManager.emit('connected', { wallet: 'solflare', address: a });
          return { success: true, wallet: 'Solflare', address: a };
        });
      },
      url: 'https://solflare.com/'
    },
    {
      id:   'backpack',  name: 'Backpack',         type: 'SOLANA',
      detect:  function () { return typeof window.xnft !== 'undefined' || typeof window.backpack !== 'undefined'; },
      connect: function () {
        var bp = window.backpack || (window.xnft && window.xnft.solana);
        return bp.connect().then(function (r) {
          var a = r.publicKey.toString();
          walletManager.currentWallet  = 'backpack';
          walletManager.currentAddress = a;
          walletManager.connected      = true;
          walletManager.emit('connected', { wallet: 'backpack', address: a });
          return { success: true, wallet: 'Backpack', address: a };
        });
      },
      url: 'https://www.backpack.app/'
    },
    {
      id:   'okx',       name: 'OKX Wallet',       type: 'EVM',
      detect:  function () { return typeof window.okxwallet !== 'undefined'; },
      connect: function () {
        return window.okxwallet.request({ method: 'eth_requestAccounts' }).then(function (acc) {
          var a = acc[0];
          walletManager.currentWallet  = 'okx';
          walletManager.currentAddress = a;
          walletManager.connected      = true;
          walletManager.emit('connected', { wallet: 'okx', address: a });
          return { success: true, wallet: 'OKX', address: a };
        });
      },
      url: 'https://www.okx.com/web3'
    },
    {
      id:   'trust',     name: 'Trust Wallet',     type: 'EVM',
      detect:  function () {
        return typeof window.trustwallet !== 'undefined' ||
               (typeof window.ethereum !== 'undefined' && !!window.ethereum.isTrust);
      },
      connect: function () { return walletManager.connectMetaMask(); },
      url: 'https://trustwallet.com/'
    },
    {
      id:   'rabby',     name: 'Rabby',             type: 'EVM',
      detect:  function () { return typeof window.ethereum !== 'undefined' && !!window.ethereum.isRabby; },
      connect: function () { return walletManager.connectMetaMask(); },
      url: 'https://rabby.io/'
    }
  ];

  // ── Styles ────────────────────────────────────────────────────────────────
  function injectStyles () {
    if (document.getElementById('wm-styles')) return;
    var s = document.createElement('style');
    s.id = 'wm-styles';
    s.textContent =
      '@keyframes wmIn{from{opacity:0}to{opacity:1}}' +
      '@keyframes wmUp{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}' +

      '#wm-overlay{display:none;position:fixed;inset:0;z-index:99999;' +
        'background:rgba(0,0,0,.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);' +
        'align-items:center;justify-content:center;padding:16px;}' +
      '#wm-overlay.wm-open{display:flex;animation:wmIn .15s ease;}' +

      '#wm-box{background:#080810;border:1px solid rgba(0,212,255,.2);border-radius:20px;' +
        'width:100%;max-width:390px;overflow:hidden;' +
        'box-shadow:0 0 0 1px rgba(0,212,255,.05),0 24px 64px rgba(0,0,0,.7),0 0 80px rgba(0,212,255,.06);' +
        'animation:wmUp .2s cubic-bezier(.22,1,.36,1);}' +

      /* Header with logo */
      '#wm-header{display:flex;align-items:center;gap:12px;padding:18px 20px 14px;' +
        'border-bottom:1px solid rgba(255,255,255,.05);}' +
      '#wm-app-logo{width:36px;height:36px;border-radius:8px;object-fit:cover;flex-shrink:0;}' +
      '#wm-app-name{flex:1;}' +
      '#wm-app-name strong{display:block;font-size:.95em;font-weight:700;' +
        'background:linear-gradient(90deg,#00d4ff,#7b2fff);' +
        '-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}' +
      '#wm-app-name span{font-size:.7em;color:#444;letter-spacing:.05em;}' +
      '#wm-x{background:none;border:none;color:#444;font-size:1.1em;cursor:pointer;' +
        'padding:4px 8px;border-radius:6px;transition:color .15s,background .15s;line-height:1;margin-left:auto;}' +
      '#wm-x:hover{color:#ccc;background:rgba(255,255,255,.07);}' +

      '#wm-sub{padding:10px 20px 4px;font-size:.73em;color:#3a3a5c;letter-spacing:.02em;}' +

      '#wm-list{display:flex;flex-direction:column;gap:2px;max-height:360px;overflow-y:auto;padding:8px 10px 12px;}' +
      '#wm-list::-webkit-scrollbar{width:3px;}' +
      '#wm-list::-webkit-scrollbar-thumb{background:rgba(0,212,255,.2);border-radius:2px;}' +

      '.wm-row{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;' +
        'border:1px solid transparent;background:transparent;cursor:pointer;' +
        'text-align:left;font-family:inherit;color:#d0d0d0;' +
        'transition:background .12s,border-color .12s,transform .1s;width:100%;}' +
      '.wm-row:hover{background:rgba(0,212,255,.05);border-color:rgba(0,212,255,.22);transform:translateX(2px);}' +
      '.wm-row:active{transform:none;background:rgba(0,212,255,.09);}' +
      '.wm-on{border-color:rgba(255,255,255,.04);}' +
      '.wm-off{opacity:.35;}.wm-off:hover{opacity:.6;}' +
      '.wm-busy{opacity:.5;pointer-events:none;}' +

      /* Icon: real image, fixed size */
      '.wm-icon{width:38px;height:38px;border-radius:10px;flex-shrink:0;object-fit:cover;display:block;}' +

      '.wm-info{flex:1;min-width:0;}' +
      '.wm-name{font-weight:600;font-size:.88em;color:#e0e0e0;}' +
      '.wm-chain{font-size:.62em;font-weight:600;color:#2a2a4a;letter-spacing:.06em;margin-top:1px;}' +

      '.wm-badge{font-size:.63em;font-weight:700;padding:2px 8px;border-radius:20px;flex-shrink:0;}' +
      '.wm-yes{background:rgba(0,255,136,.08);color:#00ff88;border:1px solid rgba(0,255,136,.2);}' +
      '.wm-no{background:rgba(255,255,255,.03);color:#2a2a4a;border:1px solid rgba(255,255,255,.06);}' +

      '#wm-status{padding:8px 20px 16px;min-height:20px;font-size:.82em;text-align:center;}' +
      '.wm-pending{color:#ffa502;}.wm-ok{color:#00ff88;}.wm-err{color:#ff4757;}';
    document.head.appendChild(s);
  }

  // ── Build modal ───────────────────────────────────────────────────────────
  function buildModal () {
    if (document.getElementById('wm-overlay')) return;
    injectStyles();

    var ov = document.createElement('div');
    ov.id = 'wm-overlay';

    // Header: app logo + name + close
    var logoSrc = '/img/logo.jpg';
    ov.innerHTML =
      '<div id="wm-box">' +
        '<div id="wm-header">' +
          '<img id="wm-app-logo" src="' + logoSrc + '" alt="SLP" onerror="this.style.display=\'none\'">' +
          '<div id="wm-app-name">' +
            '<strong>Spatial Ledger Protocol</strong>' +
            '<span>Connect your wallet to continue</span>' +
          '</div>' +
          '<button id="wm-x" aria-label="Close">&#10005;</button>' +
        '</div>' +
        '<div id="wm-sub">Detected wallets are highlighted. Click others to install.</div>' +
        '<div id="wm-list"></div>' +
        '<div id="wm-status"></div>' +
      '</div>';

    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov) closeModal(); });
    document.getElementById('wm-x').addEventListener('click', closeModal);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  }

  // ── Populate ──────────────────────────────────────────────────────────────
  function populateList () {
    var list = document.getElementById('wm-list');
    list.innerHTML = '';

    var sorted = WALLETS.slice().sort(function (a, b) {
      var da = a.detect() ? 0 : 1, db = b.detect() ? 0 : 1;
      return da !== db ? da - db : a.name.localeCompare(b.name);
    });

    sorted.forEach(function (w) {
      var on  = w.detect();
      var row = document.createElement('button');
      row.className = 'wm-row ' + (on ? 'wm-on' : 'wm-off');

      // Real icon — inline base64 SVG, always renders
      var icon = document.createElement('img');
      icon.className = 'wm-icon';
      icon.src = ICONS[w.id] || ICONS.phantom;
      icon.alt = w.name;
      row.appendChild(icon);

      var info  = document.createElement('div'); info.className = 'wm-info';
      var nm    = document.createElement('div'); nm.className   = 'wm-name';  nm.textContent = w.name;
      var chain = document.createElement('div'); chain.className = 'wm-chain'; chain.textContent = w.type;
      info.appendChild(nm); info.appendChild(chain);
      row.appendChild(info);

      var badge = document.createElement('span');
      badge.className   = 'wm-badge ' + (on ? 'wm-yes' : 'wm-no');
      badge.textContent = on ? 'Detected' : 'Install';
      row.appendChild(badge);

      row.addEventListener('click', function () {
        if (on) doConnect(w, row);
        else window.open(w.url, '_blank', 'noopener,noreferrer');
      });
      list.appendChild(row);
    });
  }

  // ── Connect ───────────────────────────────────────────────────────────────
  function doConnect (w, row) {
    var status = document.getElementById('wm-status');
    row.classList.add('wm-busy');
    status.className   = 'wm-pending';
    status.textContent = 'Opening ' + w.name + '\u2026';

    w.connect()
      .then(function (r) {
        status.className   = 'wm-ok';
        status.textContent = '\u2713 ' + r.address.slice(0,6) + '\u2026' + r.address.slice(-4);
        updateButtons(r.address);
        localStorage.setItem('spaceledger_last_wallet', w.id);
        setTimeout(closeModal, 600);
      })
      .catch(function (err) {
        row.classList.remove('wm-busy');
        status.className   = 'wm-err';
        status.textContent = err.message || 'Connection rejected';
      });
  }

  function updateButtons (address) {
    var short = address.slice(0,6) + '\u2026' + address.slice(-4);
    document.querySelectorAll('.wallet-button, #navWalletBtn').forEach(function (btn) {
      btn.textContent = short;
      btn.style.background = 'linear-gradient(90deg,#00ff88,#00d4ff)';
      btn.setAttribute('data-wallet-connected', 'true');
    });
  }

  // ── Open / close ──────────────────────────────────────────────────────────
  function openModal () {
    buildModal();
    populateList();
    document.getElementById('wm-overlay').classList.add('wm-open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal () {
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

  // ── Auto-reconnect ────────────────────────────────────────────────────────
  function autoReconnect () {
    var lastId = localStorage.getItem('spaceledger_last_wallet');
    if (!lastId) return;
    var w = WALLETS.find(function (x) { return x.id === lastId; });
    if (!w || !w.detect()) return;
    try {
      if (lastId === 'phantom' && window.solana && window.solana.isConnected && window.solana.publicKey) {
        var a = window.solana.publicKey.toString();
        walletManager.currentWallet = 'phantom'; walletManager.currentAddress = a; walletManager.connected = true;
        walletManager.emit('connected', { wallet: 'phantom', address: a });
        updateButtons(a);
      } else if (window.ethereum) {
        window.ethereum.request({ method: 'eth_accounts' }).then(function (acc) {
          if (acc && acc[0]) {
            walletManager.currentWallet = lastId; walletManager.currentAddress = acc[0]; walletManager.connected = true;
            walletManager.emit('connected', { wallet: lastId, address: acc[0] });
            updateButtons(acc[0]);
          }
        }).catch(function(){});
      }
    } catch(_){}
  }

  // ── Intercept wallet button clicks ────────────────────────────────────────
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
