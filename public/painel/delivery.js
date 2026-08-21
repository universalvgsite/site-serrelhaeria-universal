function deliveryInfo(p){
  const e=p.entrega||{},status=e.pagamentoStatus||'pendente';
  const amount=e.valorReceber==null?(status==='pago'?0:Number(p.valor)||0):Number(e.valorReceber)||0;
  return{agendadaEm:e.agendadaEm||'',entregueEm:e.entregueEm||'',recebedor:e.recebedor||'',observacao:e.observacao||'',pagamentoStatus:status,pagamentoForma:e.pagamentoForma||'',pagamentoCondicao:e.pagamentoCondicao||'avista',parcelas:Math.max(1,Number(e.parcelas)||1),valorReceber:amount}
}

function deliveryUnits(p){return(p.itens||[]).reduce((sum,item)=>sum+Math.max(0,Number(item.quantidade)||0),0)}
function deliveryPaymentStatusLabel(v){return({pendente:'Pendente / definir',pago:'Já pago',receber_entrega:'Receber na entrega'})[v]||'Pendente / definir'}
function deliveryPaymentMethodLabel(v){return({pix:'PIX',cartao:'Cartão',dinheiro:'Dinheiro'})[v]||'Não informada'}
function deliveryPaymentConditionLabel(e){return e.pagamentoCondicao==='parcelado'?`${Math.max(2,Number(e.parcelas)||2)} parcelas`:'À vista'}

window.renderDeliveries=function(){
  if(!canView('entregas'))return;
  const today=todayISO(),rows=state.pedidos.filter(p=>['pronto','entregue'].includes(p.status)||p.entrega?.agendadaEm).sort((a,b)=>(a.entrega?.agendadaEm||a.prazoEntrega||'9999').localeCompare(b.entrega?.agendadaEm||b.prazoEntrega||'9999'));
  $('#view-entregas').innerHTML=`<div class="grid cards">${metric('Prontos',state.pedidos.filter(p=>p.status==='pronto').length,'aguardando entrega')}${metric('Agendados hoje',rows.filter(p=>p.status!=='entregue'&&p.entrega?.agendadaEm===today).length,'entregas programadas')}${metric('Atrasados',state.pedidos.filter(p=>p.status==='pronto'&&p.prazoEntrega&&p.prazoEntrega<today).length,'prontos com prazo vencido','danger-text')}${metric('Entregues no mês',state.pedidos.filter(p=>p.status==='entregue'&&(p.entrega?.entregueEm||'').slice(0,7)===today.slice(0,7)).length,'concluídos')}</div><div style="height:16px"></div><div class="table-card">${rows.length?`<div class="table-wrap"><table><thead><tr><th>Pedido / OS</th><th>Cliente</th><th>Produtos</th><th>Pagamento</th><th>Status</th><th>Prazo</th><th>Agendada</th><th>Entregue</th><th>Ações</th></tr></thead><tbody>${rows.map(p=>{const e=deliveryInfo(p),payClass=e.pagamentoStatus==='pago'?'ok':e.pagamentoStatus==='receber_entrega'?'warn':'';return`<tr><td><strong>${esc(p.numero)}</strong><div class="muted">${esc(p.osNumero||'')}</div></td><td>${esc(clientName(p.clienteId))}</td><td><strong>${deliveryUnits(p)}</strong> un.</td><td><span class="pill ${payClass}">${deliveryPaymentStatusLabel(e.pagamentoStatus)}</span><div class="muted">${deliveryPaymentMethodLabel(e.pagamentoForma)}</div></td><td><span class="pill ${statusOrder(p.status)[1]}">${statusOrder(p.status)[0]}</span></td><td>${dt(p.prazoEntrega)}</td><td>${dt(e.agendadaEm)}</td><td>${dt(e.entregueEm)}</td><td><div class="actions"><button class="btn small" onclick="openDelivery('${p.id}')">Atualizar</button><button class="btn small" onclick="printDelivery('${p.id}')">Imprimir entrega</button></div></td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty"><strong>Nenhuma entrega para exibir</strong>Pedidos prontos e agendados aparecerão aqui.</div>'}</div>`;
}

window.openDelivery=function(id){
  const p=state.pedidos.find(x=>x.id===id);if(!p)return;
  const e=deliveryInfo(p),cli=state.clientes.find(x=>x.id===p.clienteId)||{},units=deliveryUnits(p);
  window._deliveryOrder=p;
  modal(`<div class="modal-head"><div><strong>Entrega · ${esc(p.numero)}</strong><div class="muted">${esc(clientName(p.clienteId))} · ${units} unidade(s) para conferência</div></div><button class="icon-btn" onclick="closeModal()">×</button></div><div class="modal-body"><div class="notice"><strong>Endereço:</strong> ${esc(cli.endereco||'Não informado')} · ${esc(cli.cidade||'Cidade não informada')}<br><strong>Telefone:</strong> ${esc(cli.telefone||'Não informado')}</div><div class="divider"></div><div class="form-grid three">${fieldInput('Entrega agendada','dScheduled','date',e.agendadaEm)}${fieldInput('Data da entrega','dDelivered','date',e.entregueEm)}${fieldInput('Recebedor','dReceiver','text',e.recebedor)}${fieldSelect('Situação do pagamento','dPayStatus',e.pagamentoStatus,[['pendente','Pendente / definir'],['pago','Já pago'],['receber_entrega','Receber na entrega']],'','onchange="updateDeliveryPaymentFields()"')}${fieldSelect('Forma de pagamento','dPayMethod',e.pagamentoForma,[['pix','PIX'],['cartao','Cartão'],['dinheiro','Dinheiro']],'Selecione')}${fieldSelect('Condição','dPayCondition',e.pagamentoCondicao,[['avista','À vista'],['parcelado','Parcelado']],'','onchange="updateDeliveryPaymentFields()"')}${fieldInput('Número de parcelas','dPayInstallments','number',e.parcelas,'min="1" step="1"')}${fieldInput('Valor total do pedido','dOrderValue','text',brl(p.valor),'disabled')}${fieldInput('Valor a receber na entrega','dPayAmount','number',e.valorReceber,'min="0" step="0.01"')}<div class="field full"><label>Observação da entrega <span class="optional">(opcional)</span></label><textarea id="dNotes">${esc(e.observacao)}</textarea></div></div><div class="divider"></div><div class="row between"><div><strong>Produtos para conferência</strong><div class="muted">A quantidade vem automaticamente do pedido para evitar divergência.</div></div><span class="pill">${units} unidade(s)</span></div><div class="table-wrap" style="margin-top:10px"><table><thead><tr><th>Produto / serviço</th><th>Medidas</th><th>Quantidade</th><th>Descrição</th></tr></thead><tbody>${(p.itens||[]).map(item=>`<tr><td><strong>${esc(productName(item.produtoId,item.produtoNome||'Item personalizado'))}</strong></td><td>${esc(item.medidas||'—')}</td><td><strong>${Number(item.quantidade)||0}</strong></td><td>${esc(item.descricao||'—')}</td></tr>`).join('')}</tbody></table></div></div><div class="modal-foot"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn" onclick="printDelivery('${p.id}')">Imprimir para entregador</button><button class="btn primary" onclick="saveDelivery('${p.id}')">Salvar entrega</button></div>`);
  updateDeliveryPaymentFields();
}

window.updateDeliveryPaymentFields=function(){
  const status=$('#dPayStatus'),condition=$('#dPayCondition'),installments=$('#dPayInstallments'),amount=$('#dPayAmount');
  if(!status||!condition||!installments||!amount)return;
  const paid=status.value==='pago',parcelled=condition.value==='parcelado';
  amount.disabled=paid;
  if(paid)amount.value=0;
  else if(Number(amount.value)<=0&&window._deliveryOrder)amount.value=Number(window._deliveryOrder.valor)||0;
  installments.disabled=!parcelled;
  if(!parcelled)installments.value=1;
  else if(Number(installments.value)<2)installments.value=2;
}

window.saveDelivery=function(id){
  const p=state.pedidos.find(x=>x.id===id);if(!p)return;
  const paymentStatus=$('#dPayStatus').value,paymentMethod=$('#dPayMethod').value,paymentCondition=$('#dPayCondition').value;
  if(paymentStatus!=='pendente'&&!paymentMethod)return toast('Informe se o pagamento será em PIX, cartão ou dinheiro.');
  const installments=paymentCondition==='parcelado'?Math.max(2,Number($('#dPayInstallments').value)||2):1;
  const rawAmount=Math.max(0,Number($('#dPayAmount').value)||0),amount=paymentStatus==='pago'?0:(rawAmount||Number(p.valor)||0);
  p.entrega={...(p.entrega||{}),agendadaEm:$('#dScheduled').value,entregueEm:$('#dDelivered').value,recebedor:$('#dReceiver').value.trim(),observacao:$('#dNotes').value.trim(),pagamentoStatus:paymentStatus,pagamentoForma:paymentMethod,pagamentoCondicao:paymentCondition,parcelas:installments,valorReceber:amount,pagamentoAtualizadoEm:new Date().toISOString()};
  if(p.entrega.entregueEm)p.status='entregue';
  p.updatedAt=new Date().toISOString();
  audit('Entrega e pagamento atualizados',`${p.numero} · ${deliveryPaymentStatusLabel(paymentStatus)} · ${deliveryPaymentMethodLabel(paymentMethod)}`,'pedidos',p.id);
  save();closeModal();toast('Entrega atualizada.');
}

window.printDelivery=function(id){
  const p=state.pedidos.find(x=>x.id===id);if(!p)return;
  const e=deliveryInfo(p),cli=state.clientes.find(x=>x.id===p.clienteId)||{},units=deliveryUnits(p),logo=state.empresa.logoUrl||'/universal-logo.png';
  const payClass=e.pagamentoStatus==='pago'?'paid':e.pagamentoStatus==='receber_entrega'?'collect':'pending';
  modal(`<div class="printable"><div class="print-controls modal-head"><strong>Romaneio de entrega</strong><div><button class="btn" onclick="closeModal()">Fechar</button> <button class="btn primary" onclick="printCurrentDocument()">Imprimir para entregador</button></div></div><div class="print-doc delivery-sheet"><header class="delivery-head"><img class="delivery-logo" src="${esc(logo)}" alt="Universal"><div class="delivery-company"><strong>${esc(state.empresa.razaoSocial||state.empresa.nome)}</strong><span>CNPJ: ${esc(state.empresa.cnpj||'')}</span><span>${esc(state.empresa.telefone||'')} · ${esc(state.empresa.endereco||'')}</span></div><div class="delivery-title"><b>ROMANEIO DE ENTREGA</b><strong>${esc(p.numero)}</strong><span>${esc(p.osNumero||'')}</span></div></header><section class="delivery-grid"><div class="delivery-box wide"><span>Cliente</span><strong>${esc(cli.nome||clientName(p.clienteId))}</strong></div><div class="delivery-box"><span>Telefone</span><strong>${esc(cli.telefone||'—')}</strong></div><div class="delivery-box wide"><span>Endereço da entrega</span><strong>${esc(cli.endereco||'—')}</strong></div><div class="delivery-box"><span>Cidade</span><strong>${esc(cli.cidade||'—')}</strong></div><div class="delivery-box"><span>Prazo</span><strong>${dt(p.prazoEntrega)}</strong></div><div class="delivery-box"><span>Agendada</span><strong>${dt(e.agendadaEm)}</strong></div></section><section class="delivery-payment ${payClass}"><div><span>Situação do pagamento</span><strong>${deliveryPaymentStatusLabel(e.pagamentoStatus)}</strong></div><div><span>Forma</span><strong>${deliveryPaymentMethodLabel(e.pagamentoForma)}</strong></div><div><span>Condição</span><strong>${deliveryPaymentConditionLabel(e)}</strong></div><div><span>Valor total</span><strong>${brl(p.valor)}</strong></div><div><span>Valor a receber</span><strong>${brl(e.pagamentoStatus==='pago'?0:e.valorReceber)}</strong></div></section><div class="delivery-section-title"><strong>CONFERÊNCIA DOS PRODUTOS</strong><span>Total: ${units} unidade(s)</span></div><table class="delivery-table"><thead><tr><th class="delivery-check">OK</th><th>Produto / serviço</th><th>Medidas</th><th>Qtd.</th><th>Descrição</th></tr></thead><tbody>${(p.itens||[]).map(item=>`<tr><td class="delivery-check">☐</td><td><strong>${esc(productName(item.produtoId,item.produtoNome||'Item personalizado'))}</strong></td><td>${esc(item.medidas||'—')}</td><td class="delivery-qty">${Number(item.quantidade)||0}</td><td>${esc(item.descricao||'—')}</td></tr>`).join('')}</tbody></table><div class="delivery-confirm">☐ Quantidade conferida &nbsp;&nbsp; ☐ Produtos sem avarias &nbsp;&nbsp; ☐ Pagamento conferido</div><section class="delivery-notes"><strong>OBSERVAÇÕES</strong><div>${esc(e.observacao||p.obs||'Sem observações.')}</div></section><footer class="delivery-signatures"><div>________________________________________<br>Entregador</div><div>________________________________________<br>Cliente / Recebedor</div></footer><div class="delivery-receipt"><span>Nome: ________________________________________</span><span>Documento: __________________________</span><span>Data: ____/____/______</span><span>Hora: ________</span></div></div></div>`);
}

renderDeliveries();
