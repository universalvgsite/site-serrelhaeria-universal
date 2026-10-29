/* Enlace de catálogo universal: script para incluir em site e Black Friday.
 * Sem dependências e sem alterar as opções/carrinho/WhatsApp existentes.
 */
(() => {
  'use strict';
  const pattern = /\b(?:POR|PTA)-\d{3,6}\b/i;
  const productCardSelector = '[data-codigo],[data-product-code],[data-produto-id],[data-product-id],.produto-card,.product-card,.card-produto,[class*="produto-card"],[class*="product-card"]';
  const isBlackFriday = /(?:^|\/)black-friday(?:\/|$)/i.test(location.pathname);
  const productUrl = (value, blackFriday = isBlackFriday) => {
    const key = String(value ?? '').trim();
    if (!/^[\w-]{1,90}$/.test(key)) return null;
    const url = new URL('/produto/' + encodeURIComponent(key), location.origin);
    if (blackFriday) url.searchParams.set('origem', 'black-friday');
    return url.pathname + url.search;
  };
  function attach(card, produto) {
    if (!card || card.dataset.universalProductLinked === '1') return false;
    const raw = produto?.codigo || produto?.id || card.dataset.codigo || card.dataset.productCode || card.dataset.produtoId || card.dataset.productId || (card.innerText || card.textContent || '').match(pattern)?.[0];
    const url = productUrl(raw);
    if (!url) return false;
    // Evita duplicar botões se a aplicação já tiver vínculo para esta rota.
    if (card.querySelector('a[href^="/produto/"]')) {card.dataset.universalProductLinked='1';return true;}
    const link = document.createElement('a');
    link.href = url;
    link.className = 'universal-detalhes-link';
    link.textContent = 'Ver fotos e detalhes';
    link.setAttribute('aria-label', `Ver detalhes do produto ${String(raw)}`);
    card.appendChild(link);
    card.dataset.universalProductLinked='1';
    const pic = card.querySelector('img');
    if (pic && !pic.closest('a,button')) {
      pic.tabIndex = pic.tabIndex >= 0 ? pic.tabIndex : 0;
      pic.setAttribute('role','link');
      pic.setAttribute('aria-label', `Abrir fotos do produto ${raw}`);
      pic.style.cursor = 'pointer';
      pic.addEventListener('click', e => { e.stopPropagation(); location.assign(url); });
      pic.addEventListener('keydown', e => { if(e.key==='Enter'){e.preventDefault();location.assign(url);} });
    }
    return true;
  }
  function scan() {
    document.querySelectorAll(productCardSelector).forEach(card => {
      if (card.querySelector(productCardSelector)) return; // apenas cartão mais interno
      attach(card);
    });
  }
  const style = document.createElement('style');
  style.textContent = '.universal-detalhes-link{display:block;max-width:100%;padding:10px 14px;margin:10px 0 0;text-align:center;border:1px solid #c8a85d;border-radius:7px;color:#d6b976!important;text-decoration:none!important;background:transparent;font:600 14px/1.35 system-ui,sans-serif;cursor:pointer}.universal-detalhes-link:hover{background:#c8a85d;color:#111!important}.universal-detalhes-link:focus-visible{outline:3px solid #ffda75;outline-offset:2px}';
  document.head.appendChild(style);
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',scan,{once:true}); else scan();
  let pending=false;
  const observer = new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;scan()})});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.UniversalProductLinks={url:productUrl,conectarCard:attach,atualizar:scan};
})();
