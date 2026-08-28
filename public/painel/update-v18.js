window.productTable=function(rows,canEdit){
  if(!rows.length)return `<div class="empty"><strong>Nenhum produto cadastrado</strong>O responsável pela Universal fará os cadastros por aqui.</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>Imagem</th><th>Produto</th><th>Categoria</th><th>Medida</th><th>Preço</th><th>Promoção</th><th>Site</th><th>Status</th><th>Ações</th></tr></thead><tbody>${rows.map(p=>`<tr><td>${p.imagem?`<img class="thumb" src="${esc(p.imagem)}">`:'—'}</td><td><strong>${esc(p.nome)}</strong><div class="muted">${esc(p.codigo||'')}</div></td><td>${esc(p.categoria||'—')}</td><td>${esc(p.medidaPadrao||'—')}</td><td>${brl(p.preco)}</td><td>${p.promocao?`<span class="pill warn">Promoção</span>${p.freteGratisCuiaba?'<div class="muted">Frete grátis Cuiabá</div>':''}`:'—'}</td><td><span class="pill ${p.siteAtivo!==false&&!p.arquivado?'ok':''}">${p.siteAtivo!==false&&!p.arquivado?'Publicado':'Oculto'}</span></td><td><span class="pill ${p.arquivado?'':'ok'}">${p.arquivado?'Arquivado':p.status==='indisponivel'?'Indisponível':'Ativo'}</span></td><td>${canEdit?`<div class="actions"><button class="btn small" onclick="openProduct('${p.id}')">Editar</button><button class="btn small ${p.arquivado?'success':'danger'}" onclick="toggleArchiveProduct('${p.id}')">${p.arquivado?'Reativar':'Arquivar'}</button></div>`:'Somente consulta'}</td></tr>`).join('')}</tbody></table></div>`;
};

function syncPromotionFreightField(){
  const promo=$('#prPromocao');
  const freight=$('#prFreteGratisCuiaba');
  if(!promo || !freight)return;
  const enabled=promo.value==='true';
  freight.disabled=!enabled;
  if(!enabled)freight.value='false';
  const note=$('#prFretePromoNote');
  if(note)note.textContent=enabled?'Ative somente se esta promoção também oferecer frete grátis para Cuiabá.':'O frete grátis de Cuiabá só pode ser ativado em produtos marcados como promoção.';
}

window.openProduct=function(id){
  if(!['administrador','gerente'].includes(currentUser.role))return toast('Seu perfil não pode alterar produtos.');
  const p=state.produtos.find(x=>x.id===id)||{id:uid('prd'),nome:'',codigo:'',categoria:'Portão',medidaPadrao:state.empresa.medidaPortao,preco:0,prazoMedio:'',descricaoPublica:'',descricaoInterna:'',material:'',espessura:'',acabamento:'',cor:'',abertura:'',carga:3,status:'ativo',siteAtivo:true,destaque:false,promocao:false,freteGratisCuiaba:false,ordem:999,imagem:'',galeria:[],arquivado:false};
  modal(`<div class="modal-head"><strong>${id?'Editar':'Novo'} produto</strong><button class="icon-btn" onclick="closeModal()">×</button></div><div class="modal-body"><div class="form-grid three">${fieldInput('Nome / modelo','prNome','text',p.nome)}${fieldInput('Código','prCodigo','text',p.codigo||'')}${fieldSelect('Categoria','prCat',p.categoria,[['Portão','Portão'],['Porta','Porta'],['Lixeira','Lixeira'],['Outro','Outro']])}${fieldInput('Medida padrão','prMed','text',p.medidaPadrao)}${fieldInput('Preço base','prPreco','number',p.preco,'min="0" step="0.01"')}${fieldInput('Prazo médio','prPrazo','text',p.prazoMedio||'')}${fieldInput('Material','prMaterial','text',p.material||'')}${fieldInput('Espessura','prEsp','text',p.espessura||'')}${fieldInput('Acabamento','prAcab','text',p.acabamento||'')}${fieldInput('Cor','prCor','text',p.cor||'')}${fieldInput('Abertura','prAbert','text',p.abertura||'')}${fieldInput('Carga estimada','prCarga','number',p.carga||1,'min="0" step="0.5"')}${fieldSelect('Disponibilidade','prStatus',p.status||'ativo',[['ativo','Ativo'],['indisponivel','Indisponível']])}${fieldSelect('Exibir no site','prSite',String(p.siteAtivo!==false),[['true','Sim'],['false','Não']])}${fieldSelect('Destaque','prDestaque',String(Boolean(p.destaque)),[['false','Não'],['true','Sim']])}${fieldSelect('Produto em promoção','prPromocao',String(Boolean(p.promocao)),[['false','Não'],['true','Sim']])}${fieldSelect('Frete grátis para Cuiabá','prFreteGratisCuiaba',String(Boolean(p.promocao&&p.freteGratisCuiaba)),[['false','Não'],['true','Sim']])}${fieldInput('Ordem no catálogo','prOrdem','number',p.ordem||999,'min="1"')}</div><div id="prFretePromoNote" class="notice" style="margin-top:14px"></div><div style="height:14px"></div><div class="form-grid"><div class="field full"><label>Descrição pública</label><textarea id="prPub">${esc(p.descricaoPublica||'')}</textarea></div><div class="field full"><label>Descrição interna</label><textarea id="prInt">${esc(p.descricaoInterna||'')}</textarea></div></div><div class="divider"></div><div class="row between"><div><strong>Imagem principal</strong></div><label class="btn small">Selecionar imagem<input id="prImageFile" type="file" accept="image/*" hidden onchange="previewAndUploadProductImage(this)"></label></div><div style="height:10px"></div><div id="prImageBox" class="image-box">${p.imagem?`<img class="thumb big" src="${esc(p.imagem)}"><span class="muted">Imagem publicada no catálogo.</span>`:'<span class="muted">Nenhuma imagem principal.</span>'}</div><div class="divider"></div><div class="row between"><div><strong>Galeria complementar</strong></div><label class="btn small">+ Adicionar<input type="file" accept="image/*" hidden onchange="uploadProductGallery(this)"></label></div><div style="height:10px"></div><div id="prGallery" class="gallery"></div><div class="divider"></div><div class="notice">Portão padrão: ${esc(state.empresa.medidaPortao)}. Porta padrão: ${esc(state.empresa.medidaPorta)}. Estruturas metálicas são orçadas somente como serviço sob medida.</div></div><div class="modal-foot"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="saveProduct('${p.id}',${Boolean(id)})">Salvar produto</button></div>`);
  window._productDraft=structuredClone(p);
  renderProductGallery();
  $('#prPromocao').addEventListener('change',syncPromotionFreightField);
  syncPromotionFreightField();
};

window.saveProduct=function(id,exists){
  const promocao=$('#prPromocao').value==='true';
  const p={...window._productDraft,id,nome:$('#prNome').value.trim(),codigo:$('#prCodigo').value.trim(),categoria:$('#prCat').value,medidaPadrao:$('#prMed').value.trim(),preco:Number($('#prPreco').value)||0,prazoMedio:$('#prPrazo').value.trim(),material:$('#prMaterial').value.trim(),espessura:$('#prEsp').value.trim(),acabamento:$('#prAcab').value.trim(),cor:$('#prCor').value.trim(),abertura:$('#prAbert').value.trim(),carga:Number($('#prCarga').value)||0,status:$('#prStatus').value,siteAtivo:$('#prSite').value==='true',destaque:$('#prDestaque').value==='true',promocao,freteGratisCuiaba:promocao&&$('#prFreteGratisCuiaba').value==='true',ordem:Number($('#prOrdem').value)||999,descricaoPublica:$('#prPub').value.trim(),descricaoInterna:$('#prInt').value.trim()};
  if(!p.nome)return toast('Informe o nome do produto.');
  if(exists)state.produtos[state.produtos.findIndex(x=>x.id===id)]={...state.produtos.find(x=>x.id===id),...p};
  else state.produtos.push({...p,arquivado:false});
  audit(exists?'Produto alterado':'Produto cadastrado',`${p.nome}${p.promocao?' · promoção':''}${p.freteGratisCuiaba?' · frete grátis Cuiabá':''}`,'produtos',id);
  save();
  closeModal();
  toast('Produto salvo. O catálogo será atualizado automaticamente.');
};
