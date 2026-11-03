(() => {
'use strict';
const P=[
{id:'01',name:'Orbital Voxel Constellation',c:[42,165,255],g:[118,78,255],h:1},
{id:'03',name:'Holographic Prism Grid',c:[36,211,255],g:[176,75,255],h:1.16},
{id:'09',name:'Whale-Scale Monument',c:[83,141,255],g:[220,92,255],h:1.55},
{id:'10',name:'Scientific Observatory',c:[40,186,255],g:[132,153,255],h:1.22},
{id:'02',name:'Golden Cube Archipelago',c:[255,181,80],g:[255,224,155],h:1.3},
{id:'05',name:'Industrial Voxel Matrix',c:[226,151,82],g:[100,178,255],h:.88},
{id:'08',name:'Luxury Gold Terminal',c:[255,198,105],g:[250,225,180],h:1.62},
{id:'09',name:'Whale-Scale Monument',c:[242,178,92],g:[143,108,255],h:1.9}
];
const TAU=Math.PI*2,CACHE=new WeakMap();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=v=>{const x=clamp(v,0,1);return x*x*(3-2*x);};
const blend=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const rgba=(c,a)=>'rgba('+c.map(Math.round).join(',')+','+a+')';
function randomizer(seed){let n=seed>>>0;return()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};}
function phase(t){const q=Math.max(0,t)/3.7,i=Math.floor(q)%P.length,f=q-Math.floor(q);return{i,a:P[i],b:P[(i+1)%P.length],m:smooth((f-.68)/.32)};}

function mount(canvas,mode,opts){
if(!canvas)return null;if(CACHE.has(canvas))return CACHE.get(canvas);
const ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});if(!ctx)return null;
let w=1,h=1,dpr=1,time=0,last=0,raf=0,visible=true,dead=false,particles=[],stars=[],hover=null,resizeObs=null,intersectionObs=null,lastStage=-1;
const reduce=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
function resize(){
const r=canvas.getBoundingClientRect();if(r.width<2||r.height<2)return;
w=r.width;h=r.height;const mobile=w<520||window.innerWidth<520;
dpr=Math.min(window.devicePixelRatio||1,mobile?1.12:1.5);
canvas.width=Math.max(1,Math.round(w*dpr));canvas.height=Math.max(1,Math.round(h*dpr));ctx.setTransform(dpr,0,0,dpr,0,0);
const rnd=randomizer(mode==='globe'?20261103:4202025),n=mode==='globe'?(mobile?28:54):(mobile?80:180);
stars=Array.from({length:n},()=>({x:rnd()*w,y:rnd()*h,r:.25+rnd()*1.25,p:rnd()*TAU,s:.14+rnd()*.46,o:rnd()*12,alt:rnd()>.55}));
render(true);
}
function background(s,t){
const a=blend(s.a.c,s.b.c,s.m),b=blend(s.a.g,s.b.g,s.m);ctx.clearRect(0,0,w,h);
const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#030815');bg.addColorStop(.52,'#071329');bg.addColorStop(1,'#020713');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
const x=w*(.5+Math.sin(t*.12)*.07),y=h*(.46+Math.cos(t*.17)*.07),g=ctx.createRadialGradient(x,y,0,x,y,Math.max(w,h)*.72);
g.addColorStop(0,rgba(a,.19));g.addColorStop(.4,rgba(b,.1));g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
const veil=ctx.createRadialGradient(w*.17,h*.8,0,w*.17,h*.8,Math.max(w,h)*.42);veil.addColorStop(0,rgba(b,.11));veil.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=veil;ctx.fillRect(0,0,w,h);
}
function drawStars(s,t,staticMode){
stars.forEach(p=>{const x=(p.x+Math.sin(t*.18+p.p)*p.o+w)%w,y=(p.y-(staticMode?0:t*p.s*4)+Math.cos(t*.13+p.p)*5+h*3)%h;
ctx.globalAlpha=staticMode?.45:(.24+(Math.sin(t*1.1+p.p)+1)*.2);ctx.fillStyle=rgba(p.alt?s.a.g:s.a.c,.9);ctx.beginPath();ctx.arc(x,y,p.r,0,TAU);ctx.fill();});ctx.globalAlpha=1;
}
function drawOrbit(s,t,cx,cy,r){
const a=blend(s.a.c,s.b.c,s.m),b=blend(s.a.g,s.b.g,s.m);ctx.save();ctx.translate(cx,cy);ctx.rotate(-.25+Math.sin(t*.08)*.04);
for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(0,0,r*(1.26+i*.19),r*(.34+i*.05),i*.12,0,TAU);ctx.strokeStyle=rgba(i===1?b:a,.25-i*.055);ctx.lineWidth=i===0?1:.7;ctx.shadowColor=rgba(a,.8);ctx.shadowBlur=i===0?10:4;ctx.stroke();}
ctx.restore();ctx.shadowBlur=0;
}
function drawGlobe(s,t,staticMode){
const cx=w/2,cy=h/2,r=Math.min(w,h)*.34,a=blend(s.a.c,s.b.c,s.m),b=blend(s.a.g,s.b.g,s.m);
background(s,t);drawStars(s,t,staticMode);drawOrbit(s,t,cx,cy,r);
const aura=ctx.createRadialGradient(cx,cy,r*.05,cx,cy,r*1.65);aura.addColorStop(0,rgba(a,.29));aura.addColorStop(.48,rgba(b,.13));aura.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=aura;ctx.beginPath();ctx.arc(cx,cy,r*1.65,0,TAU);ctx.fill();
const yaw=staticMode?.48:t*.34,pitch=-.23;
function project(lat,lon){const x=Math.cos(lat)*Math.sin(lon+yaw),y=Math.sin(lat),z=Math.cos(lat)*Math.cos(lon+yaw);return{x:cx+(x*Math.cos(pitch)-y*Math.sin(pitch))*r,y:cy-(x*Math.sin(pitch)+y*Math.cos(pitch))*r,z};}
ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.clip();
const fill=ctx.createRadialGradient(cx-r*.4,cy-r*.46,r*.04,cx,cy,r*1.2);fill.addColorStop(0,rgba(b,.66));fill.addColorStop(.42,'rgba(12,43,91,.96)');fill.addColorStop(1,'rgba(2,8,23,.99)');ctx.fillStyle=fill;ctx.fillRect(cx-r,cy-r,r*2,r*2);
for(let lat=-1.12;lat<=1.13;lat+=.36){ctx.beginPath();let pen=false;for(let i=0;i<=72;i++){const p=project(lat,i/72*TAU);if(p.z<-.06){pen=false;continue;}if(!pen){ctx.moveTo(p.x,p.y);pen=true;}else ctx.lineTo(p.x,p.y);}ctx.strokeStyle=rgba(a,.33);ctx.lineWidth=.65;ctx.stroke();}
for(let lon=0;lon<Math.PI;lon+=.31){ctx.beginPath();let pen=false;for(let i=0;i<=56;i++){const p=project(-Math.PI/2+i/56*Math.PI,lon);if(p.z<-.04){pen=false;continue;}if(!pen){ctx.moveTo(p.x,p.y);pen=true;}else ctx.lineTo(p.x,p.y);}ctx.strokeStyle=rgba(b,.3);ctx.lineWidth=.7;ctx.stroke();}
for(let i=0;i<42;i++){const lat=Math.asin(-1+2*(i+.5)/42),lon=i*2.399963+yaw,p=project(lat,lon);if(p.z<=0)continue;ctx.fillStyle=rgba(i%4===0?b:a,.82);ctx.shadowColor=rgba(a,.9);ctx.shadowBlur=5;ctx.beginPath();ctx.arc(p.x,p.y,i%5===0?1.8:1,0,TAU);ctx.fill();}
ctx.restore();ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.strokeStyle=rgba(a,.88);ctx.lineWidth=1.25;ctx.shadowColor=rgba(a,.9);ctx.shadowBlur=16;ctx.stroke();ctx.shadowBlur=0;
for(let i=0;i<9;i++){const angle=(staticMode?0:t*.34)+i/9*TAU,rr=r*(1.32+(i%3)*.12),x=cx+Math.cos(angle)*rr,y=cy+Math.sin(angle)*rr*.37;ctx.fillStyle=rgba(i%2?b:a,.92);ctx.shadowColor=rgba(a,.9);ctx.shadowBlur=9;ctx.beginPath();ctx.arc(x,y,i%3===0?2:1.2,0,TAU);ctx.fill();}
ctx.shadowBlur=0;const v=ctx.createRadialGradient(cx,cy,r*.72,cx,cy,r*1.75);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.4)');ctx.fillStyle=v;ctx.fillRect(0,0,w,h);
}
function geom(){const sx=Math.min(w*.043,h*.075,34);return{sx,sy:sx*.47,ox:w/2,oy:h*.38};}
function makeTile(col,row,state,s,g){
const sx=g.sx,sy=g.sy,x=g.ox+(col-row)*sx,y=g.oy+(col+row)*sy,index=row*10+col,selected=state.selectedPixel===index,owned=state.verified&&Boolean(state.owner),n=(col*7+row*11)%5;
let depth=(5+n*2)*s.a.h;if(s.i===2||s.i===7)depth*=1.35;if(s.i===6&&n===0)depth*=1.65;if(selected)depth*=2;
const topY=y-depth,top=[{x,y:topY},{x:x+sx,y:topY+sy},{x,y:topY+2*sy},{x:x-sx,y:topY+sy}],main=blend(s.a.c,s.b.c,s.m),other=blend(s.a.g,s.b.g,s.m),tint=owned?[36,203,206]:(n===0?other:main);
const topAlpha=selected?.78:(hover===index?.55:(owned?.43:.19));
return{col,row,index,x,y,sx,sy,depth,topY,top,selected,owned,tint,topFill:rgba(tint,topAlpha),leftFill:rgba(owned?[11,101,126]:main,selected?.72:.28),rightFill:rgba(owned?[27,139,157]:other,selected?.69:.31)};
}
function polygon(points,fill,stroke,lw){ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw||.7;ctx.stroke();}}
function allTiles(state,s){const g=geom(),out=[];for(let row=0;row<10;row++)for(let col=0;col<10;col++)out.push(makeTile(col,row,state,s,g));return out.sort((a,b)=>(a.col+a.row)-(b.col+b.row));}
function gridRings(s,t){const a=blend(s.a.c,s.b.c,s.m),cx=w/2,cy=h*.49,span=Math.min(w*.43,h*.42);ctx.save();ctx.translate(cx,cy);ctx.rotate(-.22+Math.sin(t*.1)*.03);for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse(0,0,span*(.5+i*.18),span*(.12+i*.035),0,0,TAU);ctx.strokeStyle=rgba(a,.14-i*.022);ctx.lineWidth=.7;ctx.stroke();}ctx.restore();}
function drawParticles(t){const remain=[];particles.forEach(p=>{const age=(t-p.born)/p.life;if(age>=1)return;const left=1-age,x=p.x+p.vx*age+Math.sin(age*12+p.p)*p.wobble,y=p.y+p.vy*age+Math.cos(age*10+p.p)*p.wobble;ctx.globalAlpha=left*left;ctx.fillStyle=rgba(p.c,.95);ctx.shadowColor=rgba(p.c,.9);ctx.shadowBlur=8*left;ctx.beginPath();ctx.arc(x,y,p.size*(.45+left*.6),0,TAU);ctx.fill();remain.push(p);});particles=remain;ctx.globalAlpha=1;ctx.shadowBlur=0;}
function drawGrid(s,t,staticMode){
const state=opts.getState?opts.getState():{};background(s,t);drawStars(s,t,staticMode);gridRings(s,t);
const tiles=allTiles(state,s),a=blend(s.a.c,s.b.c,s.m),ground=ctx.createRadialGradient(w/2,h*.56,0,w/2,h*.56,w*.52);ground.addColorStop(0,rgba(a,.12));ground.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=ground;ctx.fillRect(0,0,w,h);
tiles.forEach(q=>{
const right=[q.top[1],q.top[2],{x:q.top[2].x,y:q.top[2].y+q.depth},{x:q.top[1].x,y:q.top[1].y+q.depth}],left=[q.top[3],q.top[2],{x:q.top[2].x,y:q.top[2].y+q.depth},{x:q.top[3].x,y:q.top[3].y+q.depth}],edge=rgba(q.tint,q.selected?.98:(hover===q.index?.83:.39));
if(q.selected||hover===q.index){ctx.shadowColor=rgba(q.tint,.9);ctx.shadowBlur=q.selected?18:10;}
polygon(left,q.leftFill,edge,q.selected?1.2:.6);polygon(right,q.rightFill,edge,q.selected?1.2:.6);polygon(q.top,q.topFill,edge,q.selected?1.5:.7);ctx.shadowBlur=0;
if(q.selected){ctx.strokeStyle='rgba(247,252,255,.95)';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(q.top[0].x,q.top[0].y-3);q.top.forEach(p=>ctx.lineTo(p.x,p.y));ctx.closePath();ctx.stroke();}
});
drawParticles(t);ctx.font='10px ui-monospace,SFMono-Regular,Consolas,monospace';ctx.textAlign='left';ctx.fillStyle='rgba(218,235,255,.72)';ctx.fillText('BLOCK '+(state.blockLabel||'000A')+' / 10 × 10 POSITIONS',14,20);
ctx.textAlign='right';ctx.fillStyle='rgba(165,191,225,.68)';ctx.fillText(s.a.id+' · '+s.a.name.toUpperCase(),w-14,20);
if(opts.stageLabel&&lastStage!==s.i){opts.stageLabel.textContent=s.a.id+' / '+s.a.name;lastStage=s.i;}
}
function render(staticMode){if(dead)return;const s=phase(time);if(mode==='globe')drawGlobe(s,time,staticMode||reduce.matches);else drawGrid(s,time,staticMode||reduce.matches);}
function tick(now){raf=0;if(dead||!visible||document.hidden)return;if(!last)last=now;const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;if(!reduce.matches)time+=dt;render(reduce.matches);if(!reduce.matches)raf=requestAnimationFrame(tick);}
function stop(){if(raf)cancelAnimationFrame(raf);raf=0;last=0;}
function start(){if(dead||!visible||document.hidden)return;stop();render(true);if(!reduce.matches)raf=requestAnimationFrame(tick);}
function pick(event){
const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return null;const x=(event.clientX-r.left)*(w/r.width),y=(event.clientY-r.top)*(h/r.height),state=opts.getState?opts.getState():{},items=allTiles(state,phase(time));
for(let i=items.length-1;i>=0;i--){const p=items[i].top;let pos=true,neg=true;for(let k=0;k<4;k++){const u=p[k],v=p[(k+1)%4],cross=(v.x-u.x)*(y-u.y)-(v.y-u.y)*(x-u.x);if(cross<-.01)pos=false;if(cross>.01)neg=false;}if(pos||neg)return{col:items[i].col,row:items[i].row,pixelIndex:items[i].index};}return null;
}
function burst(index){
const state=opts.getState?opts.getState():{},q=allTiles(state,phase(time)).find(x=>x.index===index);if(!q)return;const random=randomizer((index+5)*811+Math.floor(time*100)),tint=blend(phase(time).a.c,phase(time).a.g,.45),n=w<520?72:180;
for(let i=0;i<n;i++){const angle=random()*TAU,speed=18+random()*(w<520?42:78);particles.push({x:q.x,y:q.topY+q.sy,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-random()*16,born:time,life:.72+random()*.76,size:.8+random()*2.1,wobble:random()*4,p:random()*TAU,c:i%5===0?[255,220,145]:tint});}
if(particles.length>520)particles=particles.slice(-520);render(false);
}
function setHover(e){const q=pick(e);hover=q?q.pixelIndex:null;render(false);}
const api={draw:()=>render(false),pick,burst,setHover,clearHover:()=>{hover=null;render(false);},destroy:()=>{dead=true;stop();if(resizeObs)resizeObs.disconnect();if(intersectionObs)intersectionObs.disconnect();window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',visibility);CACHE.delete(canvas);}};
function visibility(){if(document.hidden)stop();else start();}
if('ResizeObserver'in window){resizeObs=new ResizeObserver(resize);resizeObs.observe(canvas);}else window.addEventListener('resize',resize,{passive:true});
if('IntersectionObserver'in window){intersectionObs=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);if(visible)start();else stop();},{rootMargin:'80px'});intersectionObs.observe(canvas);}
document.addEventListener('visibilitychange',visibility);if(reduce.addEventListener)reduce.addEventListener('change',start);
resize();if(!intersectionObs)start();CACHE.set(canvas,api);return api;
}
window.SpaceLedgerWorld=Object.freeze({stages:P.map(p=>({id:p.id,name:p.name})),mountGlobe:c=>mount(c,'globe',{}),mountGrid:(c,o)=>mount(c,'grid',o||{})});
})();