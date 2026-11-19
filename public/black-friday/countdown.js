/* Contagem regressiva sincronizada com o servidor, compartilhada pelas páginas. */
(() => {
 'use strict';
 let config=null, serverAt=0, receivedAt=0, lastState=null, timerId=null, refreshId=null, busy=false, onClosed=()=>{}, onOpen=()=>{}, onChange=()=>{};
 const now=()=>serverAt+Math.max(0,performance.now()-receivedAt);
 const end=()=>Date.parse(config?.encerramento||'');
 const isActive=()=>!!config&&config.ativa===true&&!(config.encerramentoAutomatico!==false&&Number.isFinite(end())&&now()>=end());
 function discount(original,promo){
   if(original==null||promo==null||original===''||promo==='')return null;
   const a=Math.round(Number(original)*100),b=Math.round(Number(promo)*100);
   if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||b<=0||a<=b)return null;
   return {amount:(a-b)/100,percent:Math.floor((a-b)*10000/a)/100};
 }
 const dateFmt=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Cuiaba',weekday:'long',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const localDay=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Cuiaba',year:'numeric',month:'2-digit',day:'2-digit'});
 function parts(ms){const s=Math.max(0,Math.ceil(ms/1000));return [Math.floor(s/86400),Math.floor(s%86400/3600),Math.floor(s%3600/60),s%60];}
 function tick(){
   const active=isActive();
   const el=document.getElementById('bfCountdown');
   if(el){
     const left=end()-now(), visible=active&&config?.contadorAtivo!==false&&Number.isFinite(left)&&left>0;
     el.hidden=!visible;
     if(visible){
       if(!el.firstChild)el.innerHTML='<div class="bf-time-copy"><strong class="bf-time-head"></strong><span class="bf-time-deadline"></span></div><div class="bf-time-grid" aria-label="Contagem regressiva">'+['Dias','Horas','Min','Seg'].map(label=>'<div class="bf-time-cell"><b>00</b><span>'+label+'</span></div>').join('')+'</div><p class="bf-time-note">Aproveite as condições especiais antes do encerramento.</p>';
       const head=left<=3600000?'ÚLTIMA HORA!':left<=3*3600000?'ÚLTIMAS HORAS!':localDay.format(now())===localDay.format(end())?'HOJE É O ÚLTIMO DIA!':'ÚLTIMA CHANCE!';
       el.querySelector('.bf-time-head').textContent=head;
       el.querySelector('.bf-time-deadline').textContent='Termina '+dateFmt.format(end())+' (horário de MT)';
       el.querySelectorAll('.bf-time-cell b').forEach((node,i)=>node.textContent=String(parts(left)[i]).padStart(2,'0'));
     }
   }
   if(active!==lastState){const was=lastState;lastState=active;onChange(active);if(!active)onClosed();else if(was===false)onOpen();}
 }
 function update(data){
   if(!data||typeof data.ativa!=='boolean')return;
   config=data;const parsed=Date.parse(data.horarioServidor||'');serverAt=Number.isFinite(parsed)?parsed:Date.now();receivedAt=performance.now();tick();
 }
 async function refresh(){
   if(busy)return;busy=true;
   try{const r=await fetch('/api/black-friday/status',{cache:'no-store'});if(r.ok)update(await r.json());}catch{}finally{busy=false;}
 }
 function watch(data,closed=()=>{},opened=()=>location.reload(),changed=()=>{}){
   onClosed=closed;onOpen=opened;onChange=changed;
   if(data)update(data);else refresh();
   if(timerId===null){timerId=setInterval(()=>{if(config)tick();},1000);refreshId=setInterval(refresh,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(config)tick();refresh();}});window.addEventListener('pageshow',()=>refresh());}
 }
 window.UniversalBF={watch,isActive,discount};
})();
