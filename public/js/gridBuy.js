(function () {
  const original = window.showPixelDetails;
  // Enhance pixel details panel after grid script defines showPixelDetails
  function enhance() {
    if (typeof window.showPixelDetails !== 'function') return false;
    const prev = window.showPixelDetails;
    window.showPixelDetails = function (pixelIndex, globalPixelId, row, col, blockPrice) {
      prev(pixelIndex, globalPixelId, row, col, blockPrice);
      const panel = document.getElementById('pixelDetails');
      if (!panel || panel.querySelector('[data-buy-block]')) return;
      const blockId = typeof currentBlockId !== 'undefined' ? currentBlockId : 0;
      const buyUrl = '/pages/purchase.html?amount=1&asset=SOL&from=grid&block=' + encodeURIComponent(String(blockId));
      const note = document.createElement('p');
      note.style.cssText = 'color:#c4d0d7;margin-top:12px;line-height:1.55';
      note.innerHTML = 'On-chain purchases settle as <strong>whole blocks</strong> (100 pixels). Pixel-level ownership is not on-chain yet.';
      const link = document.createElement('p');
      link.style.marginTop = '14px';
      link.innerHTML = '<a class="button" data-buy-block href="' + buyUrl + '">Buy this block on Devnet</a>';
      panel.append(note, link);
    };
    return true;
  }
  if (!enhance()) {
    document.addEventListener('DOMContentLoaded', enhance);
    setTimeout(enhance, 500);
  }
})();
