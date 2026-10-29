(() => {
  'use strict';
  let phone='556536844696';
  const scene=document.getElementById('scene');
  const video=document.getElementById('neiaVideo');
  const fallback=document.getElementById('neiaFallback');
  const isSafari=/iPhone|iPad|iPod/.test(navigator.userAgent)||(/Safari\//.test(navigator.userAgent)&&!/Chrome|Chromium|CriOS|Edg/.test(navigator.userAgent));
  const player=isSafari?fallback:video;
  if(isSafari){
    const mobile=matchMedia('(max-width:680px)').matches;
    fallback.src=mobile?'assets/safari_mobile_v15.mp4':'assets/safari_desktop_v11.mp4';
  }
  const play=document.getElementById('playVideo');
  const status=document.getElementById('status');
  const cards=document.getElementById('cards');
  function showPlay(){play.hidden=false;scene.classList.remove('playing','fallback-mode');}
  async function start(){
    try{
      if(!player.paused){player.pause();showPlay();return;}
      if(player.ended)player.currentTime=0;
      await player.play();
      scene.classList.add(isSafari?'fallback-mode':'playing');
      play.hidden=true;
    }catch(err){
      console.warn('Não foi possível reproduzir o vídeo:',err);
      showPlay();
      play.setAttribute('aria-label','Não foi possível reproduzir o vídeo neste navegador');
    }
  }
  play.addEventListener('click',start);
  player.addEventListener('ended',()=>{player.currentTime=0;showPlay();});
  player.addEventListener('pause',()=>{if(!player.ended)showPlay();});
  scene.addEventListener('click',e=>{if(!player.paused&&e.target!==play&&!play.contains(e.target)){player.pause();showPlay();}});
  // Sem produtos simulados. A lista vem apenas da API da campanha no Cloudflare.
  function whatsApp(p){
    const name=(p.nome||'').trim();
    const code=p.codigo?` (código ${p.codigo})`:'';
    const text=`Olá! Tenho interesse no produto ${name}${code} anunciado na Black Friday da Serralheria Universal. Gostaria de confirmar o valor promocional e a disponibilidade.\n\nOrigem: Black Friday 2026 – Landing Page`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }
  const brl=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value);
  function elt(tag,className,txt){const e=document.createElement(tag);if(className)e.className=className;if(txt!==undefined)e.textContent=txt;return e;}
  function makeCard(p){
    const article=elt('article','card');
    article.appendChild(elt('div','card-tag','BLACK FRIDAY'));
    const img=elt('img','photo');img.src=p.imagem;img.alt=`${p.nome}`;img.loading='lazy';img.decoding='async';article.appendChild(img);
    const body=elt('div','card-body');body.appendChild(elt('h2','',p.nome));
    if(p.descricao) body.appendChild(elt('p','spec',p.descricao));
    if(Number.isFinite(p.precoPromocional) && p.precoPromocional>0){
      const prices=elt('div','price');
      if(Number.isFinite(p.precoAnterior)&&p.precoAnterior>p.precoPromocional)prices.appendChild(elt('span','old-price',brl(p.precoAnterior)));
      prices.appendChild(elt('span','new-price',brl(p.precoPromocional)));body.appendChild(prices);
    }
    const a=elt('a','wa-button','QUERO ESTA OFERTA');a.href=whatsApp(p);a.target='_blank';a.rel='noopener noreferrer';
    a.setAttribute('aria-label',`Consultar ${p.nome} pelo WhatsApp`);a.addEventListener('click',()=>track('whatsapp_click',p.id));body.appendChild(a);article.appendChild(body);return article;
  }
  function showCampaignEnded(){
    try{player.pause()}catch{}
    document.body.classList.add('campaign-ended');
    const main=document.querySelector('main');if(main)main.hidden=true;
    const message=document.getElementById('campaignEnded');if(message)message.hidden=false;
    cards.replaceChildren();
    status.hidden=true;
  }
  async function loadOffers(){
    try{
      const response=await fetch('/api/black-friday',{cache:'no-store'});
      if(!response.ok)throw new Error('API indisponível');
      const data=await response.json();
      if(data?.ativa===false){showCampaignEnded();return;}
      const items=Array.isArray(data?.produtos)?data.produtos:[];
      phone=String(data?.whatsapp||'556536844696').replace(/\D/g,'')||'556536844696';
      const selected=items.filter(p=>p && ['Portão','Porta','Lixeira'].includes(p.categoria) && p.nome && p.imagem && Number(p.precoPromocional)>0);
      cards.replaceChildren(...selected.map(makeCard));
      if(selected.length)status.hidden=true;
      else{status.hidden=false;status.textContent='Em breve: os produtos selecionados para a Black Friday aparecerão aqui.';}
    }catch{
      status.hidden=false;
      status.textContent='Não foi possível carregar as ofertas no momento. Tente novamente em instantes.';
    }
  }
  function track(eventType,productId=''){
    const q=new URLSearchParams(location.search);
    const event={eventType,productId,source:q.get('utm_source')||'landing_page',medium:q.get('utm_medium')||'organico',campaign:'black_friday_2026',content:q.get('utm_content')||'',term:q.get('utm_term')||'',fbclid:q.get('fbclid')||'',page:location.pathname,referrer:document.referrer};
    try{
      const payload=JSON.stringify(event);
      if(navigator.sendBeacon){navigator.sendBeacon('/api/track',new Blob([payload],{type:'application/json'}));}
      else fetch('/api/track',{method:'POST',headers:{'content-type':'application/json'},body:payload,keepalive:true}).catch(()=>{});
    }catch{} // falha no registro nunca deve impedir abrir o WhatsApp
  }
  track('visit');
  try {
    const address=new URL(location.href);
    if(address.searchParams.get('utm_source')==='chatgpt.com'){
      address.searchParams.delete('utm_source');
      history.replaceState(null,'',address.pathname+address.search+address.hash);
    }
  } catch {}
  loadOffers();
})();
