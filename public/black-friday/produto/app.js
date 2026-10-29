(() => {
  'use strict';
  const siteOrigin='https://universalserralheria.com.br';
  const $=selector=>document.querySelector(selector);
  const query=new URLSearchParams(location.search);
  const id=query.get('id')||'';
  const loading=$('#loading');
  const product=$('#product');
  const brl=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value));
  function showMessage(title,message){
    loading.hidden=false;
    loading.replaceChildren();
    const h=document.createElement('strong');h.textContent=title;loading.appendChild(h);
    if(message){const p=document.createElement('p');p.textContent=message;loading.appendChild(p);}
    product.hidden=true;
  }
  function track(eventType,productId=''){
    const event={
      eventType,productId,source:query.get('utm_source')||'landing_page',medium:query.get('utm_medium')||'organico',
      campaign:'black_friday_2026',content:query.get('utm_content')||'',term:query.get('utm_term')||'',
      fbclid:query.get('fbclid')||'',page:location.pathname+location.search,referrer:document.referrer
    };
    try{
      const payload=JSON.stringify(event);
      if(navigator.sendBeacon)navigator.sendBeacon('/api/track',new Blob([payload],{type:'application/json'}));
      else fetch('/api/track',{method:'POST',headers:{'content-type':'application/json'},body:payload,keepalive:true}).catch(()=>{});
    }catch{}
  }
  function shareUrl(p){return `${siteOrigin}/black-friday/produto/?id=${encodeURIComponent(p.id)}`;}
  function whatsappUrl(p,phone){
    const model=p.codigo?` (${p.codigo})`:'';
    const message=[
      `Olá! Tenho interesse no produto ${p.nome}${model}, anunciado na Black Friday 2026 da Serralheria Universal.`,
      `Valor promocional: ${brl(p.precoPromocional)}.`,
      `Link individual do produto: ${shareUrl(p)}`,
      'Gostaria de confirmar a disponibilidade e continuar o pedido.',
      'Origem: Black Friday 2026 – Página do produto'
    ].join('\n');
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }
  async function copyLink(p){
    const btn=$('#copyLink'),feedback=$('#copyFeedback'),link=shareUrl(p);
    try{
      if(!navigator.clipboard?.writeText)throw new Error('Clipboard indisponível');
      await navigator.clipboard.writeText(link);
      feedback.textContent='Link do produto copiado!';btn.textContent='LINK COPIADO ✓';
      setTimeout(()=>{btn.textContent='COPIAR LINK INDIVIDUAL DESTE PRODUTO';feedback.textContent='';},2000);
    }catch{window.prompt('Copie o link individual do produto:',link);}
  }
  async function init(){
    if(!id){showMessage('Produto não informado','Volte às ofertas e escolha o modelo que deseja visualizar.');return;}
    try{
      const response=await fetch('/api/black-friday',{cache:'no-store'});
      if(!response.ok)throw new Error('API indisponível');
      const data=await response.json();
      if(data?.ativa===false){showMessage('Black Friday encerrada','A campanha não está disponível neste momento.');return;}
      const item=(Array.isArray(data?.produtos)?data.produtos:[]).find(p=>p&&p.id===id);
      if(!item||!item.imagem||Number(item.precoPromocional)<=0){
        showMessage('Produto indisponível nesta campanha','O modelo não está mais selecionado para a Black Friday. Consulte outras ofertas.');return;
      }
      const phone=String(data.whatsapp||'556536844696').replace(/\D/g,'')||'556536844696';
      $('#category').textContent=`${item.categoria||'PRODUTO'} · BLACK FRIDAY`;
      $('#productName').textContent=item.nome||item.codigo||'Produto Universal';
      $('#productCode').textContent=item.codigo?`CÓDIGO DO MODELO: ${item.codigo}`:'';
      $('#productDescription').textContent=item.descricao||'Entre em contato para mais informações sobre este produto.';
      $('#productImage').src=item.imagem;
      $('#productImage').alt=`Foto do ${item.nome}${item.codigo?' código '+item.codigo:''}`;
      $('#fullImage').src=item.imagem;
      $('#fullImage').alt=`Imagem ampliada de ${item.nome}`;
      const previous=Number(item.precoAnterior),current=Number(item.precoPromocional);
      $('#oldPrice').textContent=previous>current?`De ${brl(previous)}`:'';
      $('#newPrice').textContent=brl(current);
      const buy=$('#buy');buy.href=whatsappUrl(item,phone);
      buy.addEventListener('click',()=>track('whatsapp_click',item.id));
      $('#copyLink').addEventListener('click',()=>copyLink(item));
      const dialog=$('#lightbox');
      const fullImage=$('#fullImage');
      let zoom=1;
      function setZoom(value){
        zoom=Math.max(1,Math.min(3,Math.round(value*2)/2));
        fullImage.style.width=`${zoom*100}%`;
        $('#zoomLevel').textContent=`${Math.round(zoom*100)}%`;
        $('#zoomOut').disabled=zoom<=1;
        $('#zoomIn').disabled=zoom>=3;
        $('#zoomViewer').scrollTo({left:0,top:0,behavior:'instant'});
      }
      $('#openImage').addEventListener('click',()=>{
        setZoom(1);dialog.showModal();track('photo_open',item.id);
      });
      $('#zoomIn').addEventListener('click',()=>setZoom(zoom+0.5));
      $('#zoomOut').addEventListener('click',()=>setZoom(zoom-0.5));
      fullImage.addEventListener('click',()=>setZoom(zoom===1?2:1));
      $('#closeImage').addEventListener('click',()=>dialog.close());
      dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
      // Preserve o título no navegador; não altera o endereço individual.
      document.title=`${item.nome} ${item.codigo?'('+item.codigo+') ':''}| Black Friday Universal`;
      loading.hidden=true;product.hidden=false;
      track('view_product',item.id);
    }catch(err){
      console.warn('Falha ao carregar produto Black Friday:',err);
      showMessage('Não foi possível carregar o produto','Tente novamente em instantes ou volte ao catálogo da Black Friday.');
    }
  }
  init();
})();
