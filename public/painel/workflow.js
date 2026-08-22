// Fluxo operacional simplificado:
// orçamento gerado -> pedido + OS -> produção -> conferência -> entrega.

function workflowOrderForBudget(budgetId){
  return state.pedidos.find(order=>order.orcamentoId===budgetId);
}

function workflowPhase(order){
  if(order.status==='cancelado')return{label:'Cancelado',cls:'danger'};
  if(order.status==='entregue')return{label:'Entregue',cls:'ok'};
  if(order.status==='pronto'||order.etapa==='liberado')return{label:'Fila de entrega',cls:'ok'};
  if(order.etapa==='aguardando_conferencia')return{label:'Aguardando conferência',cls:'warn'};
  return{label:'Em produção',cls:'info'};
}

function normalizeSimpleWorkflowState(){
  let changed=false;
  state.orcamentos.forEach(budget=>{
    if(budget.status!=='gerado'){
      budget.status='gerado';
      changed=true;
    }
  });
  state.pedidos.forEach(order=>{
    if(!order.osNumero){
      order.osNumero=nextNumber('OS',state.pedidos,'osNumero');
      changed=true;
    }
    if(order.status==='cancelado')return;
    if(order.status==='entregue'){
      if(order.etapa!=='concluido'){order.etapa='concluido';changed=true}
      return;
    }
    if(order.status==='pronto'||order.etapa==='liberado'||(order.etapa==='concluido'&&order.materiaisBaixados)){
      if(order.status!=='pronto'||order.etapa!=='liberado')changed=true;
      order.status='pronto';
      order.etapa='liberado';
      return;
    }
    if(order.status!=='producao'){
      order.status='producao';
      changed=true;
    }
    if(!['em_fabricacao','aguardando_conferencia'].includes(order.etapa)){
      order.etapa='em_fabricacao';
      changed=true;
    }
  });
  return changed;
}

statusBudget=function(){return['Gerado','info']};
statusOrder=function(status){
  return({producao:['Em produção','info'],pronto:['Fila de entrega','ok'],entregue:['Entregue','ok'],cancelado:['Cancelado','danger']})[status]||['Em produção','info'];
};

const workflowBaseSyncDraft=syncDraftFromForm;
syncDraftFromForm=function(){
  workflowBaseSyncDraft();
  if(window._budgetDraft)window._budgetDraft.status='gerado';
};

const workflowBaseOpenBudget=window.openBudget;
window.openBudget=function(id){
  workflowBaseOpenBudget(id);
  if(window._budgetDraft)window._budgetDraft.status='gerado';
  const statusField=$('#bStatus')?.closest('.field');
  if(statusField)statusField.remove();
  const linked=id?workflowOrderForBudget(id):null;
  if(linked){
    $$('#budgetForm input, #budgetForm select, #budgetForm textarea, #budgetForm button').forEach(el=>el.disabled=true);
    const hint=$('#budgetClientHint');
    if(hint)hint.textContent=`Este orçamento originou o pedido ${linked.numero}. Ele fica bloqueado para preservar os dados vendidos.`;
    const foot=$('#modalContent .modal-foot');
    if(foot)foot.innerHTML='<button class="btn primary" onclick="closeModal()">Fechar</button>';
  }
};

renderBudgets=function(){
  if(!canView('orcamentos'))return;
  const rows=state.orcamentos.slice().sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
  $('#view-orcamentos').innerHTML=`<div class="table-card"><div class="table-tools"><div><input class="search" id="budgetSearch" placeholder="Buscar orçamento ou cliente..."><div class="muted" style="margin-top:6px">Orçamento não tem etapa de aprovação: salvou, está gerado.</div></div><button class="btn primary" onclick="openBudget()">+ Novo orçamento</button></div><div id="budgetTable">${budgetTable(rows)}</div></div>`;
  $('#budgetSearch').oninput=filterBudgets;
};

budgetTable=function(rows){
  if(!rows.length)return'<div class="empty"><strong>Nenhum orçamento gerado</strong>Crie o primeiro orçamento.</div>';
  return`<div class="table-wrap"><table><thead><tr><th>Número</th><th>Data</th><th>Cliente</th><th>Vendedor</th><th>Valor</th><th>Uso</th><th>Ações</th></tr></thead><tbody>${rows.map(budget=>{
    const order=workflowOrderForBudget(budget.id);
    return`<tr><td><strong>${esc(budget.numero)}</strong></td><td>${dt(budget.data)}</td><td>${esc(clientName(budget.clienteId))}</td><td>${esc(sellerName(budget.vendedorId))}</td><td><strong>${brl(calcBudget(budget).final)}</strong></td><td>${order?`<span class="pill ok">Pedido ${esc(order.numero)}</span>`:'<span class="pill info">Gerado</span>'}</td><td><div class="actions"><button class="btn small" onclick="openBudget('${budget.id}')">${order?'Ver':'Editar'}</button><button class="btn small" onclick="printBudget('${budget.id}')">PDF / Imprimir</button></div></td></tr>`;
  }).join('')}</tbody></table></div>`;
};

filterBudgets=function(){
  const q=($('#budgetSearch')?.value||'').toLowerCase();
  $('#budgetTable').innerHTML=budgetTable(state.orcamentos.filter(budget=>(`${budget.numero} ${clientName(budget.clienteId)}`).toLowerCase().includes(q)));
};

lastBudgets=function(){
  const rows=state.orcamentos.slice().sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')).slice(0,5);
  if(!rows.length)return'<div class="empty"><strong>Nenhum orçamento ainda</strong>Crie o primeiro orçamento.</div>';
  return`<div class="list">${rows.map(budget=>{const order=workflowOrderForBudget(budget.id);return`<div class="list-item"><div><strong>${esc(budget.numero)}</strong><div class="muted">${esc(clientName(budget.clienteId))} · ${brl(calcBudget(budget).final)}</div></div><span class="pill ${order?'ok':'info'}">${order?'Virou pedido':'Gerado'}</span></div>`}).join('')}</div>`;
};

renderDashboard=function(){
  const orders=state.pedidos.filter(order=>order.status!=='cancelado');
  const awaitingOrder=state.orcamentos.filter(budget=>!workflowOrderForBudget(budget.id)).length;
  const manufacturing=orders.filter(order=>order.status==='producao'&&order.etapa!=='aguardando_conferencia').length;
  const conference=orders.filter(order=>order.status==='producao'&&order.etapa==='aguardando_conferencia').length;
  const delivery=orders.filter(order=>order.status==='pronto').length;
  const month=todayISO().slice(0,7),monthOrders=orders.filter(order=>(order.data||'').slice(0,7)===month);
  const canCreate=['administrador','gerente','vendedor'].includes(currentUser.role);
  $('#view-dashboard').innerHTML=`${renderMobileHomeMenu()}<div class="workflow-strip"><span class="workflow-step">1. Orçamento gerado</span><span class="workflow-arrow">→</span><span class="workflow-step">2. Pedido + OS</span><span class="workflow-arrow">→</span><span class="workflow-step">3. Produção</span><span class="workflow-arrow">→</span><span class="workflow-step">4. Conferência</span><span class="workflow-arrow">→</span><span class="workflow-step">5. Entrega</span></div><div style="height:16px"></div><div class="grid cards">${metric('Orçamentos sem pedido',awaitingOrder,'disponíveis para usar')}${metric('Em produção',manufacturing,'OS em fabricação')}${metric('Para conferir',conference,'produção informada como pronta')}${metric('Na fila de entrega',delivery,'conferidos e liberados')}</div><div style="height:16px"></div><div class="banner"><div><strong>${monthOrders.length} pedido(s) gerado(s) no mês · ${brl(monthOrders.reduce((sum,order)=>sum+Number(order.valor||0),0))}</strong><p>O pedido nasce de um orçamento e já cria a OS de produção.</p></div>${canCreate?'<button class="btn gold" onclick="openCreateOrder()">Gerar pedido</button>':''}</div><div style="height:16px"></div><div class="grid kpi-split"><div class="card"><div class="row between"><h3 class="section-title">Fila operacional</h3><button class="btn small" onclick="switchView('producao')">Abrir produção</button></div><div style="height:12px"></div>${workflowQueueList()}</div><div class="card"><h3 class="section-title">Últimos orçamentos</h3><div style="height:12px"></div>${lastBudgets()}</div></div>`;
};

function workflowQueueList(){
  const rows=state.pedidos.filter(order=>!['entregue','cancelado'].includes(order.status)).slice().sort((a,b)=>(a.prazoProducao||a.prazoEntrega||'9999').localeCompare(b.prazoProducao||b.prazoEntrega||'9999')).slice(0,7);
  if(!rows.length)return'<div class="empty"><strong>Fila vazia</strong>Nenhum pedido em andamento.</div>';
  return`<div class="list">${rows.map(order=>{const phase=workflowPhase(order);return`<div class="list-item"><div><strong>${esc(order.osNumero||order.numero)}</strong><div class="muted">${esc(clientName(order.clienteId))} · prazo ${dt(order.prazoEntrega||order.prazoProducao)}</div></div><span class="pill ${phase.cls}">${phase.label}</span></div>`}).join('')}</div>`;
}

function availableBudgets(){
  return state.orcamentos.filter(budget=>!workflowOrderForBudget(budget.id)).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
}

window.openCreateOrder=function(preselectedId=''){
  const budgets=availableBudgets();
  if(!budgets.length){
    return modal('<div class="modal-head"><strong>Gerar pedido</strong><button class="icon-btn" onclick="closeModal()">×</button></div><div class="modal-body"><div class="empty"><strong>Não há orçamento disponível</strong>Crie um orçamento ou use outro que ainda não virou pedido.</div></div><div class="modal-foot"><button class="btn primary" onclick="closeModal()">Fechar</button></div>');
  }
  const selected=budgets.some(b=>b.id===preselectedId)?preselectedId:budgets[0].id;
  modal(`<div class="modal-head"><div><strong>Gerar pedido e OS</strong><div class="muted">Escolha um orçamento. Os dados serão importados automaticamente.</div></div><button class="icon-btn" onclick="closeModal()">×</button></div><div class="modal-body"><div class="form-grid three">${fieldSelect('Orçamento gerado','newOrderBudget',selected,budgets.map(b=>[b.id,`${b.numero} · ${clientName(b.clienteId)} · ${brl(calcBudget(b).final)}`]))}${fieldInput('Prazo de produção','newOrderProductionDate','date','')}${fieldInput('Prazo de entrega','newOrderDeliveryDate','date','')}${fieldSelect('Produtor responsável','newOrderProducer','',state.produtores.filter(p=>p.ativo!==false).map(p=>[p.id,p.nome]),'Definir depois')}<div class="field full"><label>Observação adicional da OS <span class="optional">(opcional)</span></label><textarea id="newOrderNotes"></textarea></div></div><div id="newOrderPreview" style="margin-top:14px"></div></div><div class="modal-foot"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="saveNewOrder()">Criar pedido e OS</button></div>`);
  $('#newOrderBudget').onchange=updateNewOrderPreview;
  updateNewOrderPreview();
};

window.updateNewOrderPreview=function(){
  const budget=state.orcamentos.find(b=>b.id===$('#newOrderBudget')?.value),box=$('#newOrderPreview');
  if(!budget||!box)return;
  box.innerHTML=`<div class="notice"><strong>${esc(clientName(budget.clienteId))}</strong> · ${budget.itens.length} item(ns) · ${brl(calcBudget(budget).final)}<br><span class="muted">Ao confirmar, será criado o pedido e a OS entrará diretamente na produção.</span></div>`;
};

window.saveNewOrder=function(){
  const budget=state.orcamentos.find(b=>b.id===$('#newOrderBudget')?.value);
  if(!budget)return toast('Selecione um orçamento.');
  if(workflowOrderForBudget(budget.id))return toast('Este orçamento já virou pedido.');
  const load=(budget.itens||[]).reduce((sum,item)=>{const product=state.produtos.find(p=>p.id===item.produtoId);return sum+(Number(product?.carga||item.carga||1)*Number(item.quantidade||1))},0);
  const extraNotes=$('#newOrderNotes')?.value.trim()||'';
  const order={id:uid('ped'),numero:nextNumber('PED',state.pedidos),osNumero:nextNumber('OS',state.pedidos,'osNumero'),orcamentoId:budget.id,orcamentoVersao:budget.versao||1,clienteId:budget.clienteId,vendedorId:budget.vendedorId,data:todayISO(),prazoProducao:$('#newOrderProductionDate')?.value||'',prazoEntrega:$('#newOrderDeliveryDate')?.value||'',status:'producao',etapa:'em_fabricacao',produtorId:$('#newOrderProducer')?.value||'',carga:load||1,obs:[budget.obs||'',extraNotes].filter(Boolean).join('\n'),valor:calcBudget(budget).final,itens:structuredClone(budget.itens||[]),materiaisConsumidos:[],materiaisBaixados:false,materiaisBaixadosEm:'',attachments:[],historicoResponsavel:[],entrega:{agendadaEm:'',entregueEm:'',recebedor:'',observacao:'',pagamentoStatus:'pendente',pagamentoForma:'',pagamentoCondicao:'avista',parcelas:1,valorReceber:calcBudget(budget).final},createdAt:new Date().toISOString()};
  state.pedidos.push(order);
  audit('Pedido e OS gerados',`${order.numero} / ${order.osNumero} a partir de ${budget.numero}`,'pedidos',order.id);
  save();
  closeModal();
  switchView('pedidos');
  toast('Pedido criado e OS enviada para a produção.');
};

window.createOrderFromBudget=function(id){openCreateOrder(id)};

renderOrders=function(){
  if(!canView('pedidos'))return;
  const rows=state.pedidos.slice().sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
  const canCreate=['administrador','gerente','vendedor'].includes(currentUser.role);
  $('#view-pedidos').innerHTML=`<div class="workflow-strip compact"><span class="workflow-step done">Orçamento gerado</span><span class="workflow-arrow">→</span><span class="workflow-step active">Criar pedido</span><span class="workflow-arrow">→</span><span class="workflow-step">OS automática na produção</span></div><div style="height:16px"></div><div class="table-card"><div class="table-tools"><div class="toolbar"><input class="search" id="orderSearch" placeholder="Buscar pedido, OS ou cliente..."><select id="orderFilter" class="search"><option value="">Todos</option><option value="producao">Em produção</option><option value="conferencia">Aguardando conferência</option><option value="entrega">Fila de entrega</option><option value="entregue">Entregues</option></select></div>${canCreate?'<button class="btn primary" onclick="openCreateOrder()">+ Gerar pedido de orçamento</button>':''}</div><div id="orderTable">${orderTable(rows)}</div></div>`;
  $('#orderSearch').oninput=filterOrders;
  $('#orderFilter').onchange=filterOrders;
};

orderTable=function(rows){
  if(!rows.length)return'<div class="empty"><strong>Nenhum pedido ainda</strong>Clique em “Gerar pedido de orçamento” e escolha um orçamento já criado.</div>';
  return`<div class="table-wrap"><table><thead><tr><th>Pedido</th><th>Orçamento</th><th>Cliente</th><th>OS de produção</th><th>Fase atual</th><th>Prazos</th><th>Ações</th></tr></thead><tbody>${rows.map(order=>{const phase=workflowPhase(order),budget=state.orcamentos.find(b=>b.id===order.orcamentoId);return`<tr><td><strong>${esc(order.numero)}</strong><div class="muted">${dt(order.data)}</div></td><td>${esc(budget?.numero||'—')}</td><td>${esc(clientName(order.clienteId))}</td><td><strong>${esc(order.osNumero||'—')}</strong><div class="muted">${esc(producerName(order.produtorId))}</div></td><td><span class="pill ${phase.cls}">${phase.label}</span></td><td><div>Produção: ${dt(order.prazoProducao)}</div><div class="muted">Entrega: ${dt(order.prazoEntrega)}</div></td><td><div class="actions"><button class="btn small" onclick="openOrder('${order.id}')">Abrir pedido</button><button class="btn small" onclick="printOS('${order.id}')">Imprimir OS</button></div></td></tr>`}).join('')}</tbody></table></div>`;
};

filterOrders=function(){
  const q=($('#orderSearch')?.value||'').toLowerCase(),filter=$('#orderFilter')?.value||'';
  let rows=state.pedidos.filter(order=>(`${order.numero} ${order.osNumero||''} ${clientName(order.clienteId)}`).toLowerCase().includes(q));
  if(filter==='producao')rows=rows.filter(order=>order.status==='producao'&&order.etapa!=='aguardando_conferencia');
  if(filter==='conferencia')rows=rows.filter(order=>order.status==='producao'&&order.etapa==='aguardando_conferencia');
  if(filter==='entrega')rows=rows.filter(order=>order.status==='pronto');
  if(filter==='entregue')rows=rows.filter(order=>order.status==='entregue');
  $('#orderTable').innerHTML=orderTable(rows);
};

window.openOrder=function(id){
  const order=state.pedidos.find(p=>p.id===id);if(!order)return;
  const phase=workflowPhase(order),budget=state.orcamentos.find(b=>b.id===order.orcamentoId),canTransfer=hasPerm('transferProduction');
  modal(`<div class="modal-head"><div><strong>${esc(order.numero)} · ${esc(order.osNumero||'')}</strong><div class="muted">${esc(clientName(order.clienteId))}</div></div><span class="pill ${phase.cls}">${phase.label}</span><button class="icon-btn" onclick="closeModal()">×</button></div><div class="modal-body"><div class="notice"><strong>Origem:</strong> ${esc(budget?.numero||'Orçamento não localizado')} · versão ${order.orcamentoVersao||1}. O pedido e a OS compartilham os mesmos itens, sem redigitação.</div><div class="divider"></div><div class="form-grid three">${fieldInput('Data do pedido','orderDate','date',order.data||todayISO())}${fieldInput('Prazo de produção','orderProductionDate','date',order.prazoProducao||'')}${fieldInput('Prazo de entrega','orderDeliveryDate','date',order.prazoEntrega||'')}${fieldSelect('Produtor responsável','orderProducer',order.produtorId||'',state.produtores.filter(p=>p.ativo!==false||p.id===order.produtorId).map(p=>[p.id,p.nome]),'Não atribuído',order.produtorId&&!canTransfer?'disabled':'')}${order.produtorId&&canTransfer?'<div class="field"><label>Motivo da troca de produtor</label><input id="orderTransferReason" placeholder="Obrigatório se trocar"></div>':''}<div class="field"><label>Valor do pedido</label><input value="${brl(order.valor)}" disabled></div><div class="field full"><label>Observações da OS <span class="optional">(opcional)</span></label><textarea id="orderNotes">${esc(order.obs||'')}</textarea></div></div><div class="divider"></div><div class="row between"><strong>Itens importados do orçamento</strong><span class="pill">${(order.itens||[]).reduce((sum,item)=>sum+Number(item.quantidade||0),0)} unidade(s)</span></div>${workflowItemsTable(order)}<div class="divider"></div><div class="row between"><div><strong>Anexos da OS</strong><div class="muted">Fotos, croquis e projetos.</div></div><label class="btn small">+ Anexar arquivo<input type="file" accept="image/*,application/pdf" hidden onchange="uploadOrderAttachment('${order.id}',this)"></label></div><div class="gallery" style="margin-top:10px">${(order.attachments||[]).map(file=>`<div class="gallery-item"><a class="btn small" href="${esc(file.url)}" target="_blank">${esc(file.name||'Arquivo')}</a></div>`).join('')||'<span class="muted">Nenhum anexo.</span>'}</div></div><div class="modal-foot"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn" onclick="printOS('${order.id}')">Imprimir OS</button><button class="btn primary" onclick="saveOrderDetails('${order.id}')">Salvar alterações</button></div>`);
};

function workflowItemsTable(order){
  return`<div class="table-wrap" style="margin-top:10px"><table><thead><tr><th>Produto / serviço</th><th>Medidas</th><th>Quantidade</th><th>Descrição</th></tr></thead><tbody>${(order.itens||[]).map(item=>`<tr><td><strong>${esc(productName(item.produtoId,item.produtoNome||'Item personalizado'))}</strong></td><td>${esc(item.medidas||'—')}</td><td><strong>${Number(item.quantidade)||0}</strong></td><td>${esc(item.descricao||'—')}</td></tr>`).join('')}</tbody></table></div>`;
}

function saveOrderBasics(order,prefix){
  const oldProducer=order.produtorId||'',newProducer=$(`#${prefix}Producer`)?.value||oldProducer;
  if(oldProducer&&newProducer!==oldProducer){
    if(!hasPerm('transferProduction')){toast('Seu usuário não pode trocar o produtor.');return false}
    const reason=$(`#${prefix}TransferReason`)?.value.trim();
    if(!reason){toast('Informe o motivo da troca do produtor.');return false}
    order.historicoResponsavel=order.historicoResponsavel||[];
    order.historicoResponsavel.unshift({from:oldProducer,to:newProducer,motivo:reason,at:new Date().toISOString(),user:currentUser.name});
  }
  order.data=$(`#${prefix}Date`)?.value||order.data||todayISO();
  order.prazoProducao=$(`#${prefix}ProductionDate`)?.value||'';
  order.prazoEntrega=$(`#${prefix}DeliveryDate`)?.value||'';
  order.produtorId=newProducer;
  const notes=$(`#${prefix}Notes`);if(notes)order.obs=notes.value;
  order.updatedAt=new Date().toISOString();
  return true;
}

window.saveOrderDetails=function(id){
  const order=state.pedidos.find(p=>p.id===id);if(!order||!saveOrderBasics(order,'order'))return;
  audit('Pedido atualizado',`${order.numero} · prazos e responsável`,'pedidos',order.id);
  save();closeModal();toast('Pedido atualizado.');
};

renderProduction=function(){
  if(!canView('producao'))return;
  const rows=state.pedidos.filter(order=>order.status==='producao').slice().sort((a,b)=>{
    if(a.etapa==='aguardando_conferencia'&&b.etapa!=='aguardando_conferencia')return-1;
    if(b.etapa==='aguardando_conferencia'&&a.etapa!=='aguardando_conferencia')return 1;
    return(a.prazoProducao||'9999').localeCompare(b.prazoProducao||'9999');
  });
  const manufacturing=rows.filter(order=>order.etapa!=='aguardando_conferencia').length,conference=rows.filter(order=>order.etapa==='aguardando_conferencia').length,late=rows.filter(order=>order.prazoProducao&&order.prazoProducao<todayISO()).length;
  $('#view-producao').innerHTML=`<div class="workflow-strip compact"><span class="workflow-step active">Produção</span><span class="workflow-arrow">→</span><span class="workflow-step">Vendedor confere + informa material</span><span class="workflow-arrow">→</span><span class="workflow-step">Entrega</span></div><div style="height:16px"></div><div class="grid cards">${metric('Em fabricação',manufacturing,'OS sendo produzidas')}${metric('Aguardando conferência',conference,'prontas para o vendedor')}${metric('Produção atrasada',late,'prazo de produção vencido',late?'danger-text':'')}${metric('Total na produção',rows.length,'OS abertas')}</div><div style="height:16px"></div><div class="table-card"><div class="table-tools"><div><strong>Fila de produção e conferência</strong><div class="muted">A produção informa que terminou; o vendedor confere, lança o material e libera para entrega.</div></div><button class="btn" onclick="window.print()">Imprimir fila</button></div>${rows.length?`<div class="table-wrap"><table><thead><tr><th>OS</th><th>Cliente</th><th>Produtor</th><th>Prazo</th><th>Etapa</th><th>Ação</th></tr></thead><tbody>${rows.map(order=>{const phase=workflowPhase(order);return`<tr><td><strong>${esc(order.osNumero||order.numero)}</strong><div class="muted">${esc(order.numero)}</div></td><td>${esc(clientName(order.clienteId))}</td><td>${esc(producerName(order.produtorId))}</td><td>${dt(order.prazoProducao)}</td><td><span class="pill ${phase.cls}">${phase.label}</span></td><td><button class="btn small ${order.etapa==='aguardando_conferencia'?'success':''}" onclick="openProductionOrder('${order.id}')">${order.etapa==='aguardando_conferencia'?'Conferir e liberar':'Abrir produção'}</button></td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty"><strong>Fila vazia</strong>Nenhuma OS em produção ou aguardando conferência.</div>'}</div>`;
};

window.openProductionOrder=function(id){
  const order=state.pedidos.find(p=>p.id===id);if(!order)return;
  const conference=order.etapa==='aguardando_conferencia',canTransfer=hasPerm('transferProduction');
  order.materiaisConsumidos=order.materiaisConsumidos||[];
  window._orderDraft=order;
  modal(`<div class="modal-head"><div><strong>${esc(order.osNumero||order.numero)}</strong><div class="muted">${esc(order.numero)} · ${esc(clientName(order.clienteId))}</div></div><span class="pill ${conference?'warn':'info'}">${conference?'Aguardando conferência':'Em produção'}</span><button class="icon-btn" onclick="closeModal()">×</button></div><div class="modal-body"><div class="form-grid three">${fieldInput('Data do pedido','productionDate','date',order.data||todayISO())}${fieldInput('Prazo de produção','productionProductionDate','date',order.prazoProducao||'')}${fieldInput('Prazo de entrega','productionDeliveryDate','date',order.prazoEntrega||'')}${fieldSelect('Produtor responsável','productionProducer',order.produtorId||'',state.produtores.filter(p=>p.ativo!==false||p.id===order.produtorId).map(p=>[p.id,p.nome]),'Não atribuído',order.produtorId&&!canTransfer?'disabled':'')}${order.produtorId&&canTransfer?'<div class="field"><label>Motivo da troca de produtor</label><input id="productionTransferReason" placeholder="Obrigatório se trocar"></div>':''}<div class="field full"><label>Observações da OS <span class="optional">(opcional)</span></label><textarea id="productionNotes">${esc(order.obs||'')}</textarea></div></div><div class="divider"></div><div class="row between"><strong>Itens da OS</strong><span class="pill">${(order.itens||[]).reduce((sum,item)=>sum+Number(item.quantidade||0),0)} unidade(s)</span></div>${workflowItemsTable(order)}${conference?`<div class="divider"></div><div class="row between"><div><strong>Conferência final e material utilizado</strong><div class="muted">O vendedor confere o serviço e informa o consumo real. Ao liberar, o estoque será baixado e o pedido irá para Entregas.</div></div>${order.materiaisBaixados?'<span class="pill ok">Estoque baixado</span>':'<button type="button" class="btn small" onclick="addConsumedMaterial()">+ Material utilizado</button>'}</div><div id="materialsConsumptionBox" style="margin-top:10px">${consumedMaterialRows(order)}</div>`:'<div class="notice" style="margin-top:16px"><strong>Produção:</strong> quando o serviço estiver realmente pronto, clique em “Produção pronta”. Ele retornará ao vendedor para conferência.</div>'}</div><div class="modal-foot"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn" onclick="printOS('${order.id}')">Imprimir OS</button>${conference?`<button class="btn success" onclick="releaseToDelivery('${order.id}')">Conferir e enviar para entrega</button>`:`<button class="btn" onclick="saveProductionOrder('${order.id}')">Salvar</button><button class="btn primary" onclick="markProductionReady('${order.id}')">Produção pronta</button>`}</div>`);
};

window.saveProductionOrder=function(id){
  const order=state.pedidos.find(p=>p.id===id);if(!order||!saveOrderBasics(order,'production'))return;
  audit('Produção atualizada',`${order.osNumero||order.numero} · responsável e prazos`,'pedidos',order.id);
  save();closeModal();toast('Produção atualizada.');
};

window.markProductionReady=function(id){
  const order=state.pedidos.find(p=>p.id===id);if(!order||!saveOrderBasics(order,'production'))return;
  if(!order.produtorId)return toast('Defina o produtor responsável antes de informar que a produção está pronta.');
  order.status='producao';
  order.etapa='aguardando_conferencia';
  order.producaoProntaEm=new Date().toISOString();
  order.producaoProntaPor=currentUser.name;
  audit('Produção pronta para conferência',`${order.osNumero||order.numero} · ${clientName(order.clienteId)}`,'pedidos',order.id);
  save();closeModal();toast('Produção pronta. O vendedor já pode fazer a conferência.');
};

window.releaseToDelivery=function(id){
  const order=state.pedidos.find(p=>p.id===id);if(!order||!saveOrderBasics(order,'production'))return;
  syncConsumedMaterials(order);
  if(!order.materiaisBaixados){
    const used=(order.materiaisConsumidos||[]).filter(item=>item.materialId&&Number(item.quantidade)>0);
    if(!used.length)return toast('Informe pelo menos um material utilizado antes de liberar para entrega.');
    const missing=used.find(item=>!state.estoqueMateriais.some(material=>material.id===item.materialId));
    if(missing)return toast('Há um material que não existe mais no estoque.');
    applyStockConsumption(order);
  }
  order.status='pronto';
  order.etapa='liberado';
  order.conferidoEm=new Date().toISOString();
  order.conferidoPor=currentUser.name;
  order.entrega={...(order.entrega||{}),pagamentoStatus:order.entrega?.pagamentoStatus||'pendente',pagamentoCondicao:order.entrega?.pagamentoCondicao||'avista',parcelas:order.entrega?.parcelas||1,valorReceber:Number(order.entrega?.valorReceber??order.valor)||0};
  audit('OS conferida e liberada para entrega',`${order.osNumero||order.numero} · materiais baixados`,'pedidos',order.id);
  save();closeModal();switchView('entregas');toast('Conferência concluída. O pedido já está na fila de entrega.');
};

renderReports=function(){
  if(!canView('relatorios'))return;
  const validOrders=state.pedidos.filter(order=>order.status!=='cancelado'),conversion=state.orcamentos.length?Math.round(new Set(validOrders.map(order=>order.orcamentoId).filter(Boolean)).size/state.orcamentos.length*100):0,delivered=validOrders.filter(order=>order.status==='entregue'),production=validOrders.filter(order=>order.status==='producao'),delivery=validOrders.filter(order=>order.status==='pronto');
  $('#view-relatorios').innerHTML=`<div class="grid report-grid">${metric('Orçamentos que viraram pedido',conversion+'%','pedidos / orçamentos gerados')}${metric('Valor dos pedidos',brl(validOrders.reduce((sum,order)=>sum+Number(order.valor||0),0)),'histórico sem cancelados')}${metric('OS em produção',production.length,'inclui conferência')}${metric('Na fila de entrega',delivery.length,'conferidos e liberados')}${metric('Pedidos entregues',delivered.length,'concluídos')}${metric('Produtores ativos',state.produtores.filter(p=>p.ativo!==false).length,'equipe de fabricação')}</div><div style="height:16px"></div><div class="grid kpi-split"><div class="card"><h3 class="section-title">Produção por responsável</h3><div style="height:12px"></div>${producerReport()}</div><div class="card"><h3 class="section-title">Marketing · últimos 30 dias</h3><div id="marketingBox" style="margin-top:12px"><span class="muted">Carregando eventos do site...</span></div></div></div>`;
};

titles.orcamentos=['Orçamentos','Crie e imprima propostas. Ao salvar, o orçamento está gerado.'];
titles.pedidos=['Pedidos','Escolha um orçamento gerado e transforme em pedido com OS automática.'];
titles.producao=['Produção e conferência','Produza, confira o serviço, registre o material e libere para entrega.'];
