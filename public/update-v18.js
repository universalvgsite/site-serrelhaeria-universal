function promotionHasFreeCuiaba(product){
  return Boolean(product?.promocao && product?.freteGratisCuiaba);
}

function decoratePromotionCards(){
  const container=document.querySelector('#products');
  if(!container || !Array.isArray(DATA?.products))return;

  container.querySelectorAll('.productCard').forEach(card=>{
    const details=card.querySelector('[onclick^="openProduct"]');
    const match=details?.getAttribute('onclick')?.match(/openProduct\('([^']+)'\)/);
    const product=match ? DATA.products.find(item=>item.id===match[1]) : null;
    if(!product)return;

    const visual=card.querySelector('.prodVisual');
    if(product.promocao && visual && !visual.querySelector('.promoFlag')){
      visual.insertAdjacentHTML('beforeend','<span class="promoFlag">PROMOÇÃO</span>');
    }

    const price=card.querySelector('.price');
    if(promotionHasFreeCuiaba(product) && price && !card.querySelector('.shippingDeal')){
      price.insertAdjacentHTML('beforebegin','<div class="shippingDeal">✓ Frete grátis para Cuiabá e Várzea Grande</div>');
    }
  });
}

window.openProduct=function(id){
  const p=findProduct(id);
  if(!p)return;
  const freeCuiaba=promotionHasFreeCuiaba(p);
  track('view_product',p.id);
  analytics('view_item',{item_id:p.id,item_name:p.nome,value:Number(p.preco)||0,currency:'BRL'});
  $('#modalBody').innerHTML=`<div class="modalGrid"><div class="modalImage">${productImage(p)}</div><div class="modalInfo"><div class="eyebrow">${p.promocao?'Promoção · ':''}${esc(p.categoria||'Produto Universal')}</div><h2>${esc(p.nome)}</h2><div class="modalPrice">${brl(p.preco)}</div><div class="prodSpec"><span>Medida padrão</span><strong>${esc(p.medidaPadrao||'Sob consulta')}</strong></div>${p.descricaoPublica?`<p>${esc(p.descricaoPublica)}</p>`:''}<div class="delivery"><div>Várzea Grande<b>Frete grátis</b></div><div class="${freeCuiaba?'free':''}">Cuiabá<b>${freeCuiaba?'Frete grátis nesta promoção':'R$ 100,00'}</b></div></div><div class="notice"><strong>Venda somente do produto.</strong><br>Instalação e automatização não estão inclusas.</div><div class="modalBtns"><a class="cta" href="${wa(`Olá! Vim pelo site da Serralheria e Metalúrgica Universal e tenho interesse no ${p.nome} (${p.codigo||p.id}), medida padrão ${p.medidaPadrao||''}.${freeCuiaba?' Vi que esta promoção tem frete grátis para Cuiabá.':''} Gostaria de continuar o atendimento.`)}" target="_blank" rel="noopener" onclick="leadClick('${p.id}','standard')">Comprar / consultar pelo WhatsApp</a><button class="secondary" onclick="customMeasure('${p.id}')">${p.categoria==='Lixeira'?'Consultar outro tamanho':'Quero medida personalizada'}</button></div></div></div>`;
  $('#productModal').showModal();
};

const productsContainer=document.querySelector('#products');
if(productsContainer){
  new MutationObserver(decoratePromotionCards).observe(productsContainer,{childList:true,subtree:true});
  decoratePromotionCards();
}
