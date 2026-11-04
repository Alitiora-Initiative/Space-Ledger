(() => {
  'use strict';
  const ua=navigator.userAgent||'';
  const phone=Boolean(navigator.userAgentData?.mobile)||/iPhone|iPod|Android.*Mobile|Windows Phone/i.test(ua);
  const ipad=/iPad/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const androidTablet=/Android/i.test(ua)&&!/Mobile/i.test(ua);
  const tier=phone?'phone':(ipad||androidTablet?'tablet':'desktop');
  document.documentElement.dataset.deviceTier=tier;
  window.SpaceLedgerDeviceTier=tier;
})();