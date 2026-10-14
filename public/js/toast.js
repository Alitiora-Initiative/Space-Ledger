(function () {
  if (window.SpaceLedgerToast) return;
  const styleId = 'space-ledger-toast-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = [
      '.sl-toast-host{position:fixed;z-index:10000;right:16px;bottom:16px;display:flex;flex-direction:column;gap:10px;max-width:min(380px,calc(100vw - 24px));pointer-events:none}',
      '.sl-toast{pointer-events:auto;padding:14px 16px;border-radius:12px;background:rgba(8,18,28,.96);border:1px solid rgba(0,212,255,.35);color:#e8f4f8;box-shadow:0 12px 40px rgba(0,0,0,.45);font-size:.92rem;line-height:1.45}',
      '.sl-toast strong{color:#7de8ff}',
      '.sl-toast a{color:#9ee9f5}',
      '.sl-toast-ok{border-color:rgba(0,255,136,.4)}',
      '.sl-toast-err{border-color:rgba(255,71,87,.45)}'
    ].join('');
    document.head.appendChild(style);
  }
  function host() {
    let el = document.getElementById('sl-toast-host');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sl-toast-host';
      el.className = 'sl-toast-host';
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    return el;
  }
  function show(message, opts) {
    opts = opts || {};
    const node = document.createElement('div');
    node.className = 'sl-toast' + (opts.ok ? ' sl-toast-ok' : opts.error ? ' sl-toast-err' : '');
    node.innerHTML = message;
    host().appendChild(node);
    setTimeout(function () { node.remove(); }, opts.duration || 7000);
  }
  window.SpaceLedgerToast = { show: show };
})();
