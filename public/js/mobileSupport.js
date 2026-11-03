(() => {
 'use strict';
 const ua=navigator.userAgent||'';
 const phone=Boolean(navigator.userAgentData?.mobile)||/iPhone|iPod|Android.*Mobile|Windows Phone/i.test(ua);
 const ipad=/iPad/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const androidTablet=/Android/i.test(ua)&&!/Mobile/i.test(ua);
 const tier=phone?'phone':(ipad||androidTablet?'tablet':'desktop');
 document.documentElement.dataset.deviceTier=tier;
 document.body.dataset.deviceTier=tier;
 document.body.classList.toggle('sl-mobile-lite',tier==='phone');
 function browseLinks(){
  const current=new URL(location.href);
  if(current.protocol!=='https:'&&current.hostname!=='localhost')throw new Error('Wallet links require HTTPS.');
  const target=encodeURIComponent(current.href),ref=encodeURIComponent(location.origin);
  return {phantom:'https://phantom.app/ul/browse/'+target+'?ref='+ref,solflare:'https://solflare.com/ul/v1/browse/'+target+'?ref='+ref};
 }
 if(tier==='phone'&&!document.querySelector('.sl-mobile-lite-notice')){
  const main=document.querySelector('main');
  if(main){
   const aside=document.createElement('aside');aside.className='sl-mobile-lite-notice';aside.setAttribute('aria-label','Mobile Lite experience');
   const heading=document.createElement('strong');heading.textContent='Mobile Lite';
   const copy=document.createElement('p');copy.textContent='Browse the universe, inspect blocks, view confirmed activity and check holdings. Purchases and creator/workspace tools are desktop/tablet-only for now. Use a Windows or macOS computer, or an iPad/tablet, for the full workspace.';
   const actions=document.createElement('div');actions.className='sl-mobile-wallet-actions';
   const links=browseLinks();
   [['Open in Phantom',links.phantom],['Open in Solflare',links.solflare]].forEach(([label,href])=>{const link=document.createElement('a');link.href=href;link.rel='noopener noreferrer';link.className='button';link.textContent=label;actions.append(link);});
   const guide=document.createElement('a');guide.href='/pages/mobile.html#desktop-app';guide.className='sl-mobile-guide-link';guide.textContent='Device and installation guide';
   aside.append(heading,copy,actions,guide);main.insertBefore(aside,main.firstChild);
  }
 }
 if('serviceWorker'in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){
  const registerWorker=()=>navigator.serviceWorker.register('/sw.js').catch(()=>{});
  if(document.readyState==='complete')registerWorker();
  else window.addEventListener('load',registerWorker,{once:true});
 }
 let installPrompt=null;
 window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();installPrompt=event;document.documentElement.classList.add('sl-install-available');
  document.querySelectorAll('[data-install-space-ledger]').forEach(button=>button.hidden=false);
 });
 document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-install-space-ledger]');if(!button)return;
  if(!installPrompt){location.href='/pages/mobile.html#desktop-app';return;}
  installPrompt.prompt();await installPrompt.userChoice.catch(()=>null);installPrompt=null;
  document.documentElement.classList.remove('sl-install-available');
  document.querySelectorAll('[data-install-space-ledger]').forEach(item=>item.hidden=true);
 });
 window.SpaceLedgerDevice=Object.freeze({tier,isMobileLite:phone,browseLinks});
})();