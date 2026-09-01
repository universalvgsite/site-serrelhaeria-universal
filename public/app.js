const $=(s,e=document)=>e.querySelector(s); const $$=(s,e=document)=>[...e.querySelectorAll(s)];
let DATA={empresa:{whatsapp:'556536844696',telefone:'(65) 3684-4696',freteVG:0,freteCuiaba:100,medidaPortao:'3,10 x 2,10 m',medidaPorta:'0,80 x 2,10 m'},products:[]};
let activeCategory='';
const params=new URLSearchParams(location.search);
const attribution={source:params.get('utm_source')||localStorage.getItem('u_source')||'',medium:params.get('utm_medium')||localStorage.getItem('u_medium')||'',campaign:params.get('utm_campaign')||localStorage.getItem('u_campaign')||'',content:params.get('utm_content')||localStorage.getItem('u_content')||'',term:params.get('utm_term')||localStorage.getItem('u_term')||'',fbclid:params.get('fbclid')||localStorage.getItem('u_fbclid')||''};
Object.entries(attribution).forEach(([k,v])=>{if(v)localStorage.setItem('u_'+k,v)});
function brl(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0)}
function esc(v=''){return String(v).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]))}
function wa(text){return `https://wa.me/${DATA.empresa.whatsapp||'556536844696'}?text=${encodeURIComponent(text)}`}
function whatsLabel(v=''){const d=String(v).replace(/\D/g,'');const n=d.startsWith('55')?d.slice(2):d;return n.length===10?`(${n.slice(0,2)}) ${n.slice(2,6)}-${n.slice(6)}`:n.length===11?`(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`:v}
async function track(eventType,productId=''){try{await fetch('/api/track',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({eventType,productId,...attribution,page:location.href,referrer:document.referrer})})}catch{}}
function analytics(eventName,params={}){if(window.gtag)window.gtag('event',eventName,params);if(window.fbq){const map={generate_lead:'Lead',contact:'Contact',view_item:'ViewContent'};window.fbq('track',map[eventName]||'CustomEvent',{event_name:eventName,...params})}}
function injectAnalytics(){const ga=String(DATA.empresa.ga4Id||'').trim(),meta=String(DATA.empresa.metaPixelId||'').trim();if(ga&&!window.gtag){const s=document.createElement('script');s.async=true;s.src=`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga)}`;document.head.appendChild(s);window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config',ga)}if(meta&&!window.fbq){!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',meta);fbq('track','PageView')}}
function productLabel(p){return `${p.categoria||'Produto'} ${p.codigo||''}`.trim()}
function productImage(p){if(p.imagem)return `<img src="${esc(p.imagem)}" alt="${esc(productLabel(p))}" loading="lazy">`;return `<div class="prodFallback"><div class="prodGate"></div></div>`}
function hasPrice(p){return Number(p.preco)>0}
function hasCuiabaFreeShipping(p){return Boolean(p.promocaoAtiva&&p.freteGratisCuiaba)}
function priceMarkup(p,modal=false){const cls=modal?'modalPrice':'price';if(!hasPrice(p))return `<div class="${cls} quotePrice"><strong>Solicite orçamento</strong></div>`;if(p.promocaoAtiva&&Number(p.precoPromocional)>0&&Number(p.precoPromocional)<Number(p.preco))return `<div class="${cls} promoPrice"><span class="oldPrice">De ${brl(p.preco)}</span><strong>${brl(p.precoPromocional)}</strong><small>Preço promocional</small></div>`;return `<div class="${cls}"><strong>${brl(p.preco)}</strong></div>`}
function saleValue(p){if(!hasPrice(p))return null;return p.promocaoAtiva&&Number(p.precoPromocional)>0&&Number(p.precoPromocional)<Number(p.preco)?p.precoPromocional:p.preco}
function saleAction(p,long=false){return saleValue(p)==null?'Solicitar orçamento':long?'Comprar pelo WhatsApp':'Comprar'}
function addOnPrice(key){const value=Number(DATA.empresa?.[key]);return Number.isFinite(value)&&value>0?value:0}
function canAddSocialGate(p){return p.categoria==='Portão'&&!p.temPortaoSocial&&p.permiteAdicionarPortaoSocial===true&&addOnPrice('adicionalPortaoSocial')>0}
function canAddTetraLock(p,socialGateSelected=false){
  if(!(addOnPrice('adicionalFechaduraTetra')>0))return false;
  if(p.categoria==='Porta')return p.tipoFechadura==='normal';
  if(p.categoria!=='Portão')return false;
  if(p.temPortaoSocial)return p.tipoFechadura==='normal';
  return canAddSocialGate(p)&&socialGateSelected;
}
function hasSelectableAddOns(p){return canAddSocialGate(p)||canAddTetraLock(p,false)}
function calculateProductSelection(p,selection={}){
  const addSocial=canAddSocialGate(p)&&selection.portaoSocial===true;
  const addTetra=canAddTetraLock(p,addSocial)&&selection.fechaduraTetra===true;
  const socialValue=addSocial?addOnPrice('adicionalPortaoSocial'):0;
  const tetraValue=addTetra?addOnPrice('adicionalFechaduraTetra'):0;
  const extraTotal=socialValue+tetraValue;
  const baseValue=saleValue(p);
  return {addSocial,addTetra,socialValue,tetraValue,extraTotal,baseValue,total:baseValue==null?null:baseValue+extraTotal};
}
function standardProductMessage(p){
  const value=saleValue(p),shippingMessage=hasCuiabaFreeShipping(p)?' A promoção inclui frete grátis para Cuiabá.':'';
  return value==null?`Olá! Vim pelo site da Serralheria e Metalúrgica Universal e tenho interesse no ${productLabel(p)}. Gostaria de solicitar um orçamento.${shippingMessage}`:`Olá! Vim pelo site da Serralheria e Metalúrgica Universal. Quero comprar o ${productLabel(p)} pelo valor de ${brl(value)}.${shippingMessage} Gostaria de continuar o pedido.`;
}
function productSelectionMessage(p,selection={}){
  const calculated=calculateProductSelection(p,selection);
  const configured=Boolean(p.temPortaoSocial||p.tipoFechadura||calculated.addSocial||calculated.addTetra);
  if(!configured)return standardProductMessage(p);
  const lines=[`Olá! Vim pelo site da Serralheria e Metalúrgica Universal e tenho interesse no ${productLabel(p)}.`];
  if(calculated.baseValue==null)lines.push('Valor do produto: sob orçamento.');
  else lines.push(`Valor do produto: ${brl(calculated.baseValue)}.`);
  if(p.categoria==='Portão'&&p.temPortaoSocial)lines.push('Portão social: incluso.');
  if(calculated.addSocial)lines.push(`Adicionar portão social com fechadura normal: + ${brl(calculated.socialValue)}.`);
  if(calculated.addTetra)lines.push(`Trocar pela fechadura tetra: + ${brl(calculated.tetraValue)}.`);
  else if((p.categoria==='Porta'||p.temPortaoSocial)&&p.tipoFechadura==='normal')lines.push('Fechadura normal: inclusa.');
  else if((p.categoria==='Porta'||p.temPortaoSocial)&&p.tipoFechadura==='tetra')lines.push('Fechadura tetra: inclusa.');
  if(calculated.extraTotal>0)lines.push(calculated.total==null?`Valor dos adicionais: ${brl(calculated.extraTotal)}.`:`Total com os adicionais: ${brl(calculated.total)}.`);
  if(hasCuiabaFreeShipping(p))lines.push('A promoção inclui frete grátis para Cuiabá.');
  lines.push(calculated.baseValue==null?'Gostaria de receber o orçamento.':'Gostaria de continuar o pedido.');
  return lines.join('\n');
}
function includedAddOn(label,detail){return `<div class="addOnIncluded"><span aria-hidden="true">✓</span><div><strong>${label}</strong>${detail?`<small>${detail}</small>`:''}</div></div>`}
function productAddOnMarkup(p){
  const parts=[];
  const tetraValue=addOnPrice('adicionalFechaduraTetra');
  if(p.categoria==='Portão'&&p.temPortaoSocial){
    parts.push(includedAddOn('Portão social incluso',p.tipoFechadura==='tetra'?'Fechadura tetra inclusa.':p.tipoFechadura==='normal'?'Fechadura normal inclusa.':''));
    if(canAddTetraLock(p,false))parts.push(`<label class="addOnChoice"><input id="addTetraLock" type="checkbox" onchange="updateProductAddOns('${p.id}')"><span><strong>Trocar pela fechadura tetra</strong><small>+ ${brl(tetraValue)}</small></span></label>`);
  }else if(canAddSocialGate(p)){
    parts.push(`<label class="addOnChoice"><input id="addSocialGate" type="checkbox" onchange="updateProductAddOns('${p.id}')"><span><strong>Adicionar portão social</strong><small>+ ${brl(addOnPrice('adicionalPortaoSocial'))} · fechadura normal inclusa</small></span></label><div class="nestedAddOn" id="socialGateLockOptions" hidden>${tetraValue>0?`<label class="addOnChoice"><input id="addTetraLock" type="checkbox" onchange="updateProductAddOns('${p.id}')"><span><strong>Trocar pela fechadura tetra</strong><small>+ ${brl(tetraValue)}</small></span></label>`:''}</div>`);
  }
  if(p.categoria==='Porta'&&p.tipoFechadura==='normal'){
    parts.push(includedAddOn('Fechadura normal inclusa',canAddTetraLock(p,false)?'Você pode trocar por uma fechadura tetra.':''));
    if(canAddTetraLock(p,false))parts.push(`<label class="addOnChoice"><input id="addTetraLock" type="checkbox" onchange="updateProductAddOns('${p.id}')"><span><strong>Trocar pela fechadura tetra</strong><small>+ ${brl(tetraValue)}</small></span></label>`);
  }else if(p.categoria==='Porta'&&p.tipoFechadura==='tetra')parts.push(includedAddOn('Fechadura tetra inclusa','Sem cobrança adicional.'));
  if(!parts.length)return '';
  return `<section class="productAddOns"><div class="productAddOnsHead"><strong>Opções do produto</strong><small>Selecione antes de continuar pelo WhatsApp.</small></div>${parts.join('')}<div class="addOnTotal" id="productAddOnTotal" hidden><span>Total com adicionais</span><strong></strong></div>${p.promocaoAtiva&&hasSelectableAddOns(p)?'<p class="addOnPromoNote">A promoção é aplicada ao produto. Os adicionais mantêm o valor integral.</p>':''}</section>`;
}
window.updateProductAddOns=function(id){
  const p=findProduct(id);if(!p)return;
  const socialSelected=Boolean($('#addSocialGate')?.checked);
  const nested=$('#socialGateLockOptions');if(nested)nested.hidden=!socialSelected;
  const tetraInput=$('#addTetraLock');
  if(tetraInput&&!canAddTetraLock(p,socialSelected))tetraInput.checked=false;
  const calculated=calculateProductSelection(p,{portaoSocial:socialSelected,fechaduraTetra:Boolean(tetraInput?.checked)});
  const totalBox=$('#productAddOnTotal');
  if(totalBox){
    totalBox.hidden=calculated.extraTotal<=0;
    if(calculated.extraTotal>0){totalBox.querySelector('span').textContent=calculated.total==null?'Valor dos adicionais':'Total com adicionais';totalBox.querySelector('strong').textContent=brl(calculated.total??calculated.extraTotal)}
  }
  const action=$('#productWhatsAppAction');
  if(action){
    action.href=wa(productSelectionMessage(p,{portaoSocial:calculated.addSocial,fechaduraTetra:calculated.addTetra}));
    action.onclick=()=>leadClick(p.id,calculated.baseValue==null?'quote':'purchase',calculated.total??calculated.extraTotal);
  }
};
function render(){const products=Array.isArray(DATA.products)?DATA.products:[],hasProducts=products.length>0,catalog=$('#catalogo'),catalogLink=$('#catalogMenuLink'),catalogCta=$('#catalogCta');catalog.hidden=!hasProducts;catalogLink.hidden=!hasProducts;if(hasProducts){catalogCta.textContent='Ver modelos';catalogCta.href='#catalogo';catalogCta.classList.remove('wa-generic');catalogCta.removeAttribute('target')}else{catalogCta.textContent='Solicitar orçamento';catalogCta.href='#';catalogCta.classList.add('wa-generic')}if(!hasProducts){$('#products').innerHTML='';return}const list=products.filter(p=>!activeCategory||p.categoria===activeCategory);$('#products').innerHTML=list.length?list.map(p=>`<article class="productCard"><div class="prodVisual">${productImage(p)}<span class="prodTag">${esc(p.codigo||p.categoria||'UNIVERSAL')}</span>${p.promocaoAtiva?'<span class="promoBadge">PROMOÇÃO</span>':''}</div><div class="prodBody"><div class="prodCategory">${esc(p.categoria||'Produto Universal')}</div><p>${esc(p.descricaoPublica||'Consulte as características deste modelo com nossa equipe.')}</p>${priceMarkup(p)}<div class="prodBtns"><button class="cta" onclick="openProduct('${p.id}')">Ver produto</button><button class="secondary" onclick="buyOrQuote('${p.id}')">${saleAction(p)}</button></div></div></article>`).join(''):`<div class="emptyCatalog"><strong>Consulte outros modelos desta categoria.</strong><br>Fale com a Universal pelo WhatsApp.</div>`}
function findProduct(key){return DATA.products.find(p=>p.id===key||p.codigo===key)}
function productShareUrl(product){
  const key=product?.codigo||product?.id;
  const url=new URL('/',window.location.origin);
  if(key)url.searchParams.set('produto',key);
  return url.href;
}
function syncProductUrl(product){
  const url=productShareUrl(product);
  if(window.location.href!==url)window.history.replaceState({produto:product.codigo||product.id},'',url);
  return url;
}
window.copyProductLink=function(id,button){
  const product=findProduct(id);
  if(!product)return;
  const link=productShareUrl(product);
  const fallback=()=>window.prompt('Copie o link individual deste produto:',link);
  const copied=()=>{
    if(!button)return;
    const original=button.textContent;
    button.textContent='Link copiado';
    button.disabled=true;
    setTimeout(()=>{button.disabled=false;button.textContent=original},1800);
  };
  if(navigator.clipboard?.writeText)navigator.clipboard.writeText(link).then(copied).catch(fallback);else fallback();
};
window.openProduct=function(id){
  const p=findProduct(id);
  if(!p)return;
  syncProductUrl(p);
  const label=productLabel(p),value=saleValue(p),freeCuiaba=hasCuiabaFreeShipping(p);
  track('view_product',p.id);
  analytics('view_item',{item_id:p.id,item_name:label,value:Number(value)||0,currency:'BRL'});
  $('#modalBody').innerHTML=`<div class="modalGrid"><div class="modalImage">${productImage(p)}${p.promocaoAtiva?'<span class="promoBadge modalPromo">PROMOÇÃO</span>':''}</div><div class="modalInfo"><div class="eyebrow">${esc(p.categoria||'Produto Universal')}</div><h2>${esc(p.codigo||'Modelo Universal')}</h2><p class="modalDescription">${esc(p.descricaoPublica||'Consulte as características deste modelo com nossa equipe.')}</p>${priceMarkup(p,true)}${productAddOnMarkup(p)}<div class="delivery"><div>Várzea Grande<b>Frete grátis</b></div><div class="${freeCuiaba?'freeDelivery':''}">Cuiabá<b>${freeCuiaba?'Frete grátis':'R$ 100,00'}</b></div></div><div class="notice"><strong>Venda somente do produto.</strong><br>Instalação e automatização não estão inclusas.</div><div class="modalBtns"><a class="cta" id="productWhatsAppAction" href="#" target="_blank" rel="noopener">${saleAction(p,true)}</a><button class="secondary" onclick="customMeasure('${p.id}')">Preciso de outra medida</button><button type="button" class="secondary shareProductBtn" onclick="copyProductLink('${p.id}',this)">Copiar link do produto</button></div></div></div>`;
  updateProductAddOns(p.id);
  $('#productModal').showModal();
};
window.buyOrQuote=function(id){const p=findProduct(id);if(!p)return;if(hasSelectableAddOns(p)){openProduct(id);return}const value=saleValue(p),message=standardProductMessage(p);track('whatsapp_click',p.id);analytics('generate_lead',{item_id:p.id,lead_type:value==null?'quote':'purchase',value:Number(value)||0,currency:'BRL'});window.open(wa(message),'_blank','noopener')}
window.customMeasure=function(id=''){const p=id?findProduct(id):null;const msg=p?`Olá! Vim pelo site da Serralheria e Metalúrgica Universal. Tenho interesse no ${productLabel(p)}, mas preciso informar as medidas para receber um orçamento.`:'Olá! Vim pelo site da Serralheria e Metalúrgica Universal e preciso de um portão ou porta com medida personalizada. Gostaria de solicitar um orçamento.';track('whatsapp_click',p?.id||'');analytics('generate_lead',{item_id:p?.id||'',lead_type:'custom_measure'});window.open(wa(msg),'_blank','noopener')}
window.leadClick=function(id,type,value=0){track('whatsapp_click',id);analytics('generate_lead',{item_id:id,lead_type:type,value:Number(value)||0,currency:'BRL'})}
function setGenericLinks(){const msg='Olá! Vim pelo site da Serralheria e Metalúrgica Universal e gostaria de mais informações.';$$('.wa-generic').forEach(a=>{a.href=wa(msg);a.target='_blank';a.onclick=()=>{track('whatsapp_click');analytics('contact')}});$$('.wa-custom').forEach(a=>{a.href='#';a.onclick=e=>{e.preventDefault();customMeasure('')}});$$('.wa-structure').forEach(a=>{a.href=wa('Olá! Vim pelo site da Serralheria e Metalúrgica Universal e gostaria de solicitar um orçamento para estrutura metálica/serviço sob medida.');a.target='_blank';a.onclick=()=>{track('whatsapp_click');analytics('generate_lead',{lead_type:'structure'})}})}
async function init(){try{const r=await fetch('/api/catalog',{cache:'no-store'});if(!r.ok)throw new Error();DATA=await r.json()}catch{}const contactDigits=String(DATA.empresa.whatsapp||'556536844696').replace(/\D/g,'');const contactLabel=whatsLabel(contactDigits)||'(65) 3684-4696';$('#topPhone').textContent=contactLabel;$('#topCall').href=`tel:+${contactDigits}`;$('#topCall').setAttribute('aria-label',`Ligar para a Universal no número ${contactLabel}`);$('#footerPhone').textContent=`WhatsApp: ${contactLabel}`;injectAnalytics();render();setGenericLinks();track('page_view');const sharedProduct=params.get('produto');if(sharedProduct&&findProduct(sharedProduct))openProduct(sharedProduct)}
$$('.filter').forEach(b=>b.onclick=()=>{$$('.filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');activeCategory=b.dataset.cat;render()});$('#closeModal').onclick=()=>$('#productModal').close();$('#mobileBtn').onclick=()=>$('#menu').classList.toggle('open');$$('#menu a').forEach(a=>a.onclick=()=>$('#menu').classList.remove('open'));$('#year').textContent=new Date().getFullYear();init();
