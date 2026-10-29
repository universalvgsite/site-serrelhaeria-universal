// Cloudflare Pages Function: /produto/:codigo
// Consulta o mesmo D1 do catálogo. Não modifica app_state nem dados do painel.
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = value => {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'string' ? Number(value.replace(/\s/g, '').replace(',', '.')) : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const brl = value => new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(value);
const isEnabled = obj => obj && ![false,0,'false','0'].includes(obj.ativo) && ![false,0,'false','0'].includes(obj.ativa) && ![false,0,'false','0'].includes(obj.habilitada) && !['encerrada','encerrado','inativo','inativa','desativada','desativado'].includes(String(obj.status ?? '').toLowerCase());

// Compatibilidade conservadora: apenas usa preço especial se encontrar produto
// explicitamente listado na configuração da campanha dentro do estado D1.
// IMPORTANTE: conferir os nomes dos campos da campanha real antes de publicar.
function ofertaBlackFriday(state, produto) {
  const bf = state.blackFriday || state.black_friday || state.campanhaBlackFriday;
  if (!isEnabled(bf)) return null;
  const itens = Array.isArray(bf) ? bf : (bf?.produtos || bf?.itens || bf?.ofertas);
  if (!Array.isArray(itens)) return null;
  const item = itens.find(x => x && typeof x === 'object' &&
    [x.produtoId, x.idProduto, x.id, x.codigo].some(id => id != null && [produto.id, produto.codigo].some(v => String(v).toLowerCase() === String(id).toLowerCase())));
  if (!item || !isEnabled(item) || item.participa === false || item.selecionado === false) return null;
  const preco = [item.precoBlackFriday,item.precoEspecial,item.precoPromocional,item.valorPromocional,item.precoOferta,item.valorOferta].map(money).find(v => v !== null);
  // Não reutiliza o preço normal como se fosse promoção.
  if (preco === undefined) return null;
  return { preco, quantidade: item.quantidade ?? item.estoque ?? null, sobEncomenda: item.sobEncomenda === true };
}

function publicImage(src, siteOrigin) {
  if (typeof src !== 'string' || !src.trim()) return null;
  try {
    const u = new URL(src, siteOrigin);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (u.origin !== siteOrigin && u.protocol !== 'https:') return null;
    return u.href;
  } catch (_) { return null; }
}
function renderNotFound(message) {
  return new Response(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Produto indisponível | Universal</title><body style="font-family:system-ui;background:#111;color:white;padding:32px"><h1>${escapeHtml(message)}</h1><p><a style="color:#d9b66c" href="/">Voltar ao catálogo</a></p></body></html>`, {status:404, headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
}
export async function onRequestGet({request,env,params}) {
  const origin = new URL(request.url).origin;
  const codigo = String(params?.codigo || '').trim();
  if (!/^[a-z0-9_-]{1,90}$/i.test(codigo)) return renderNotFound('Produto não encontrado');
  if (!env.DB) return new Response('Configuração do banco DB não encontrada.', {status:503});
  let state;
  try {
    const result = await env.DB.prepare('SELECT data FROM app_state WHERE id = 1').first();
    state = JSON.parse(result?.data || 'null');
  } catch (_) { return new Response('Catálogo temporariamente indisponível.', {status:503}); }
  if (!state || !Array.isArray(state.produtos)) return renderNotFound('Catálogo indisponível');
  const product = state.produtos.find(p => p && [p.codigo,p.id].some(v => String(v || '').toLowerCase() === codigo.toLowerCase()));
  if (!product || product.siteAtivo === false || product.arquivado === true || ['inativo','excluido','excluído'].includes(String(product.status||'').toLowerCase())) return renderNotFound('Produto não disponível no catálogo');

  const input = new URL(request.url);
  const solicitadaBF = input.searchParams.get('origem') === 'black-friday';
  const oferta = solicitadaBF ? ofertaBlackFriday(state, product) : null;
  const normal = money(product.promocaoAtiva && product.precoPromocional ? product.precoPromocional : product.preco);
  const valor = oferta ? oferta.preco : normal;
  const precoOriginal = money(product.preco);
  const descricao = String(product.descricaoPublica || product.descricao || '').trim();
  const nome = String(product.nome || product.codigo || 'Produto Universal');
  const code = String(product.codigo || product.id);
  const categoria = String(product.categoria || 'Produto');
  const imagem = publicImage(product.imagem, origin);
  const demais = Array.isArray(product.galeria) ? product.galeria : [];
  const fotos = [...new Set([imagem,...demais.map(f => publicImage(typeof f === 'string' ? f : f?.url || f?.imagem, origin))].filter(Boolean))];
  const whats = String(state.empresa?.whatsapp || '').replace(/\D/g,'');
  const urlProduto = new URL(`/produto/${encodeURIComponent(code)}`, origin);
  if (solicitadaBF && oferta) urlProduto.searchParams.set('origem','black-friday');
  const isBF = Boolean(oferta);
  const msg = [
    'Olá! Tenho interesse neste produto da Serralheria Universal.',
    `Produto: ${nome}`,
    `Código: ${code}`,
    valor !== null ? `${isBF ? 'Preço Black Friday' : 'Preço anunciado'}: ${brl(valor)}` : 'Preço: sob consulta',
    isBF ? 'Origem: Black Friday' : 'Origem: Catálogo',
    `Link: ${urlProduto.href}`,
    'Gostaria de mais informações.'
  ].join('\n');
  const linkWhats = whats ? `https://wa.me/${whats}?text=${encodeURIComponent(msg)}` : null;
  const title = `${nome} (${code}) | Serralheria Universal`;
  const description = `${categoria} ${code}${valor ? ` — ${brl(valor)}` : ''}. Confira fotos e detalhes na Serralheria Universal.`;
  const disponibilidade = isBF && oferta.quantidade !== null
    ? `<p class="estoque">${escapeHtml(oferta.quantidade)} unidade(s) informada(s) para pronta entrega</p>`
    : isBF && oferta.sobEncomenda ? '<p class="estoque">Sob encomenda</p>' : '';
  const notice = solicitadaBF && !oferta ? '<p class="aviso">A oferta Black Friday deste item não está disponível no momento. Abaixo está o preço regular do catálogo, quando informado.</p>' : '';
  const galeria = fotos.map((src,i)=> `<a class="foto" href="${escapeHtml(src)}" target="_blank" rel="noopener noreferrer" aria-label="Ampliar foto ${i+1}"><img src="${escapeHtml(src)}" alt="${escapeHtml(nome)} — foto ${i+1}" loading="${i === 0 ? 'eager' : 'lazy'}" /></a>`).join('');
  const faixa = isBF ? '<span class="campanha">OFERTA BLACK FRIDAY</span>' : '';
  const precoAntigo = isBF && precoOriginal && precoOriginal > valor ? `<p class="anterior">De <s>${escapeHtml(brl(precoOriginal))}</s></p>` : '';
  const preco = valor !== null ? `<p class="preco">${escapeHtml(brl(valor))}</p>` : '<p class="preco">Valor sob consulta</p>';
  const whatsapp = linkWhats ? `<a class="whatsapp" href="${escapeHtml(linkWhats)}" target="_blank" rel="noopener noreferrer">Consultar este produto pelo WhatsApp</a>` : '<p>Contato indisponível no momento.</p>';
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><meta property="og:type" content="product"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(urlProduto.href)}">${imagem ? `<meta property="og:image" content="${escapeHtml(imagem)}">` : ''}<meta name="theme-color" content="#101010"><style>
  :root{color-scheme:dark;font-family:Inter,system-ui,Segoe UI,sans-serif;background:#0f0f0f;color:#fafafa}*{box-sizing:border-box}body{margin:0}a{color:inherit}header{border-bottom:1px solid #34302a;padding:16px max(20px,calc((100vw - 1150px)/2));display:flex;align-items:center;gap:15px}header img{height:55px;max-width:120px;object-fit:contain}header strong{letter-spacing:.09em;font-size:14px;color:#d5b46a}header a{text-decoration:none}main{max-width:1150px;margin:auto;padding:28px 20px 70px}.voltar{color:#d2ae60;text-decoration:none;font-size:14px}.produto{display:grid;grid-template-columns:minmax(0,1.13fr) minmax(300px,.87fr);gap:36px;margin-top:23px}.fotos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.foto{display:block;background:#1e1e1e;border:1px solid #3b3427;border-radius:12px;overflow:hidden;min-height:190px}.foto:first-child{grid-column:1/-1;min-height:360px}.foto img{width:100%;height:100%;min-height:190px;max-height:330px;object-fit:contain;display:block}.foto:first-child img{max-height:560px;min-height:320px}.dados{padding:6px 0}.campanha{display:inline-block;background:#c49c47;color:#131313;font-size:11px;font-weight:800;letter-spacing:.08em;border-radius:4px;padding:6px 10px}h1{font-size:clamp(26px,4vw,39px);line-height:1.16;margin:18px 0 10px}small{color:#b5b5b5}.anterior{color:#999;margin:22px 0 0}.preco{font-size:clamp(29px,5vw,43px);font-weight:800;color:#e6c375;margin:12px 0 28px}.whatsapp{display:block;text-align:center;padding:18px 14px;font-weight:700;text-decoration:none;color:#fff;background:#168447;border-radius:8px}.descricao{white-space:pre-line;line-height:1.7;color:#dedede;margin-top:25px}.aviso{border-left:3px solid #d8aa52;background:#28241e;padding:14px;line-height:1.5}.estoque{color:#d6b66c}footer{padding:20px;text-align:center;color:#777;border-top:1px solid #272727;font-size:12px}@media(max-width:730px){.produto{grid-template-columns:1fr;gap:16px}.foto:first-child{min-height:240px}.foto:first-child img{min-height:220px}header{padding:12px 18px}}
  </style></head><body><header><a href="/"><img src="/universal-logo.png" alt="Logo Universal"></a><a href="/"><strong>SERRALHERIA UNIVERSAL</strong></a></header><main><a class="voltar" href="${solicitadaBF ? '/black-friday/' : '/'}">← Voltar ${solicitadaBF ? 'à Black Friday' : 'ao catálogo'}</a><section class="produto"><div class="fotos">${galeria || '<div class="foto" style="display:grid;place-items:center">Foto indisponível</div>'}</div><div class="dados">${faixa}<h1>${escapeHtml(nome)}</h1><small>${escapeHtml(categoria)} · Código ${escapeHtml(code)}</small>${notice}${precoAntigo}${preco}${disponibilidade}${whatsapp}${descricao ? `<div class="descricao">${escapeHtml(descricao)}</div>` : ''}</div></section></main><footer>Metalúrgica e Serralheria Universal — Várzea Grande, MT</footer></body></html>`;
  return new Response(html,{status:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin'}});
}
