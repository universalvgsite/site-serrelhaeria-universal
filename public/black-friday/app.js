(() => {
  'use strict';
  let phone='556536844696';
  const siteOrigin='https://universalserralheria.com.br';
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

  const brl=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value));
  function elt(tag,className,txt){const e=document.createElement(tag);if(className)e.className=className;if(txt!==undefined)e.textContent=txt;return e;}
  function productPath(p){return `/black-friday/produto/?id=${encodeURIComponent(p.id)}`;}
  function shareUrl(p){return siteOrigin+productPath(p);}
  function whatsApp(p){
    const code=p.codigo?` (${p.codigo})`:'';
    const text=[
      `Olá! Tenho interesse no produto ${p.nome}${code}, anunciado na Black Friday 2026 da Serralheria Universal.`,
      `Valor da oferta: ${brl(p.precoPromocional)}.`,
      `Link individual do produto: ${shareUrl(p)}`,
      'Gostaria de confirmar a disponibilidade e continuar o pedido.',
      'Origem: Black Friday 2026 – Landing Page'
    ].join('\n');
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }
  async function copyLink(p,button){
    const link=shareUrl(p);
    try{
      if(!navigator.clipboard?.writeText)throw new Error('clipboard não disponível');
      await navigator.clipboard.writeText(link);
      const old=button.textContent;
      button.textContent='LINK COPIADO!';
      setTimeout(()=>{button.textContent=old;},1800);
    }catch{window.prompt('Copie o link individual do produto:',link);}
  }
  function makeCard(p){
    const article=elt('article','card');
    article.appendChild(elt('div','card-tag','BLACK FRIDAY'));
    const photoLink=elt('a','card-photo-link');photoLink.href=productPath(p);
    photoLink.setAttribute('aria-label',`Abrir foto ampliada e detalhes de ${p.nome}`);
    const img=elt('img','photo');img.src=p.imagem;img.alt=`Foto do produto ${p.nome}${p.codigo?' - '+p.codigo:''}`;img.loading='lazy';img.decoding='async';
    photoLink.appendChild(img);photoLink.appendChild(elt('span','photo-hint','TOQUE PARA VER A FOTO MAIOR'));
    article.appendChild(photoLink);
    const body=elt('div','card-body');
    const title=elt('h2');const titleLink=elt('a','card-title-link',p.nome);titleLink.href=productPath(p);title.appendChild(titleLink);body.appendChild(title);
    if(p.codigo)body.appendChild(elt('p','product-code',`Modelo ${p.codigo}`));
    if(p.descricao)body.appendChild(elt('p','spec',p.descricao));
    const promo=Number(p.precoPromocional),original=Number(p.precoAnterior);
    if(Number.isFinite(promo)&&promo>0){
      const prices=elt('div','price');
      if(Number.isFinite(original)&&original>promo)prices.appendChild(elt('span','old-price',`De ${brl(original)}`));
      prices.appendChild(elt('span','new-price',brl(promo)));body.appendChild(prices);
    }
    const actions=elt('div','card-actions');
    const details=elt('a','details-button','VER FOTOS, PREÇO E COMPRAR');details.href=productPath(p);actions.appendChild(details);
    const copy=elt('button','copy-link-button','COPIAR LINK DO MODELO');copy.type='button';copy.addEventListener('click',()=>copyLink(p,copy));actions.appendChild(copy);
    body.appendChild(actions);article.appendChild(body);return article;
  }
  function showCampaignEnded(){
    try{player.pause();}catch{}
    document.body.classList.add('campaign-ended');
    const main=document.querySelector('main');if(main)main.hidden=true;
    const message=document.getElementById('campaignEnded');if(message)message.hidden=false;
    cards.replaceChildren();status.hidden=true;
  }
  async function loadOffers(){
    try{
      const response=await fetch('/api/black-friday',{cache:'no-store'});
      if(!response.ok)throw new Error('API indisponível');
      const data=await response.json();
      if(data?.ativa===false){showCampaignEnded();return;}
      const items=Array.isArray(data?.produtos)?data.produtos:[];
      phone=String(data?.whatsapp||'556536844696').replace(/\D/g,'')||'556536844696';
      const selected=items.filter(p=>p && ['Portão','Porta','Lixeira'].includes(p.categoria) && p.id && p.nome && p.imagem && Number(p.precoPromocional)>0);
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
    }catch{} // O registro não bloqueia a compra
  }
  track('visit');
  try{
    const address=new URL(location.href);
    if(address.searchParams.get('utm_source')==='chatgpt.com'){
      address.searchParams.delete('utm_source');
      history.replaceState(null,'',address.pathname+address.search+address.hash);
    }
  }catch{}
  loadOffers();
})();
