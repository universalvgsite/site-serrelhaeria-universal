const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];

let state={empresa:{whatsapp:'556536844696'},produtos:[]};
let stateVersion='';
let currentUser=null;
let currentView='dashboard';
let usersCache=[];
let metrics={today:0,week:0,month:0,total:0,period:0,whatsappClicks:0,bioToday:0,bioWeek:0,bioMonth:0,bioTotal:0,bioPeriod:0,bioWhatsappClicks:0};
let metricsFilter={from:'',to:''};

const viewText={
  dashboard:['Resumo','Acessos e contatos recebidos pelo site.'],
  produtos:['Produtos','Cadastre portões, portas e lixeiras que aparecem no catálogo.'],
  usuarios:['Usuários','Controle quem administra ou cadastra produtos.']
};
const codePrefixes={'Portão':'POR','Porta':'PTA','Lixeira':'LIX'};

function esc(value=''){return String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]))}
function brl(value){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value)||0)}
function uid(prefix='id'){return `${prefix}_${Date.now().toString(36)}_${crypto.randomUUID().slice(0,8)}`}
function roleLabel(role){return role==='administrador'?'Administrador':'Cadastrador'}
function canManageUsers(){return currentUser?.role==='administrador'}
function toast(message){const box=$('#toast');box.textContent=message;box.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>box.classList.remove('show'),3200)}
function modal(html){$('#modalContent').innerHTML=html;if(!$('#modal').open)$('#modal').showModal()}
function closeModal(){if($('#modal').open)$('#modal').close();$('#modalContent').innerHTML=''}

async function api(path,options={}){
  const response=await fetch('/api/'+path,{credentials:'same-origin',...options,headers:{...(options.body instanceof FormData?{}:{'content-type':'application/json'}),...(options.headers||{})}});
  let data={};
  try{data=await response.json()}catch{}
  if(!response.ok){const error=new Error(data.error||'Não foi possível concluir a operação.');error.status=response.status;error.code=data.code;throw error}
  return data;
}

function showAuth(type){
  $('#authScreen').hidden=false;
  $('#appShell').hidden=true;
  $('#bootstrapBox').hidden=type!=='bootstrap';
  $('#loginBox').hidden=type!=='login';
  $('#authError').hidden=true;
}
function authError(message){$('#authError').textContent=message;$('#authError').hidden=false}

async function initAuth(){
  try{
    const status=await api('bootstrap/status');
    if(status.needsBootstrap){showAuth('bootstrap');return}
    try{
      const response=await api('me');
      currentUser=response.user;
      if(currentUser.mustChangePassword){$('#authScreen').hidden=true;forcePasswordChange();return}
      await enterApp();
    }catch{showAuth('login')}
  }catch{showAuth('login');authError('Não foi possível conectar ao banco de dados. Confira o binding D1 chamado DB no Cloudflare.')}
}

async function bootstrap(){
  try{
    await api('bootstrap',{method:'POST',body:JSON.stringify({name:$('#bootName').value,email:$('#bootEmail').value,password:$('#bootPassword').value})});
    showAuth('login');$('#loginEmail').value=$('#bootEmail').value;toast('Administrador criado. Faça o login.');
  }catch(error){authError(error.message)}
}
async function login(){
  try{
    const response=await api('login',{method:'POST',body:JSON.stringify({email:$('#loginEmail').value,password:$('#loginPassword').value})});
    currentUser=response.user;
    if(currentUser.mustChangePassword){$('#authScreen').hidden=true;forcePasswordChange();return}
    await enterApp();
  }catch(error){authError(error.message)}
}
function forcePasswordChange(){
  modal(`<div class="modalHead"><strong>Troca obrigatória de senha</strong></div><div class="modalBody"><div class="notice">Defina uma nova senha com pelo menos 8 caracteres antes de acessar o painel.</div><div style="height:16px"></div><label class="field"><span>Nova senha</span><input id="newPassword" type="password" minlength="8" autocomplete="new-password"></label></div><div class="modalFoot"><button class="btn primary" id="changePasswordBtn">Salvar nova senha</button></div>`);
  $('#changePasswordBtn').onclick=changePasswordNow;
}
async function changePasswordNow(){
  try{await api('change-password',{method:'POST',body:JSON.stringify({password:$('#newPassword').value})});currentUser.mustChangePassword=false;closeModal();await enterApp();toast('Senha alterada.')}catch(error){toast(error.message)}
}
async function enterApp(){
  const response=await api('state');
  state={empresa:{whatsapp:'556536844696',...(response.state?.empresa||{})},produtos:Array.isArray(response.state?.produtos)?response.state.produtos:[]};
  stateVersion=response.version||'';
  currentUser=response.user||currentUser;
  $('#authScreen').hidden=true;$('#appShell').hidden=false;
  applyUserUI();
  await loadMetrics();
  switchView(currentView==='usuarios'&&!canManageUsers()?'dashboard':currentView);
}
async function logout(){try{await api('logout',{method:'POST'})}catch{}location.reload()}

function applyUserUI(){
  const initials=(currentUser?.name||'U').split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();
  $('#userChip').innerHTML=`<div class="avatar">${esc(initials)}</div><div><strong>${esc(currentUser?.name||'Usuário')}</strong><small>${roleLabel(currentUser?.role)}</small></div>`;
  $('#sideUser').textContent=`${currentUser?.name||'Usuário'} · ${roleLabel(currentUser?.role)}`;
  $$('.adminOnly').forEach(element=>element.hidden=!canManageUsers());
}
function switchView(view){
  if(view==='usuarios'&&!canManageUsers()){toast('Acesso restrito ao administrador.');return}
  currentView=view;
  $$('.view').forEach(element=>element.classList.toggle('active',element.id===`view-${view}`));
  $$('.navBtn').forEach(button=>button.classList.toggle('active',button.dataset.view===view));
  $('#pageTitle').textContent=viewText[view][0];$('#pageSubtitle').textContent=viewText[view][1];
  if(view==='dashboard'){renderDashboard();loadMetrics()}
  if(view==='produtos')renderProducts();
  if(view==='usuarios')loadUsers();
  window.scrollTo(0,0);
}

function metricsQuery(){
  return metricsFilter.from&&metricsFilter.to?`?from=${encodeURIComponent(metricsFilter.from)}&to=${encodeURIComponent(metricsFilter.to)}`:'';
}
async function loadMetrics(){
  try{metrics=await api('metrics'+metricsQuery());renderDashboard()}catch(error){if(currentView==='dashboard')toast(error.message)}
}
function metricCard(label,value,detail,type=''){
  const icon=type==='whatsapp'?'<path d="M12 21a9 9 0 1 0-7.6-4.2L3 22l5.4-1.4A9 9 0 0 0 12 21z"/><path d="M8.5 7.8c.5 4 3.7 7.1 7.7 7.7"/>':'<path d="M2 12s3.7-6 10-6 10 6 10 6-3.7 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>';
  return `<article class="metricCard ${type}"><div class="metricIcon"><svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg></div><span>${label}</span><strong>${Number(value||0).toLocaleString('pt-BR')}</strong><p>${detail}</p></article>`;
}
function renderDashboard(){
  const view=$('#view-dashboard');if(!view)return;
  const periodLabel=metricsFilter.from&&metricsFilter.to?`De ${metricsFilter.from.split('-').reverse().join('/')} até ${metricsFilter.to.split('-').reverse().join('/')}`:'Escolha as datas para filtrar';
  const cards=(prefix='')=>prefix?`${metricCard('Acessos hoje',metrics.bioToday,'Data atual no horário de Cuiabá')}${metricCard('Acessos na semana',metrics.bioWeek,'Últimos 7 dias')}${metricCard('Acessos no mês',metrics.bioMonth,'Mês atual')}${metricCard('Período selecionado',metrics.bioPeriod,periodLabel)}${metricCard('Total da bio',metrics.bioTotal,'Todos os acessos da campanha')}${metricCard('WhatsApp no período',metrics.bioWhatsappClicks,'Cliques pelo link da bio no intervalo','whatsapp')}`:`${metricCard('Acessos hoje',metrics.today,'Data atual no horário de Cuiabá')}${metricCard('Acessos na semana',metrics.week,'Últimos 7 dias')}${metricCard('Acessos no mês',metrics.month,'Mês atual')}${metricCard('Período selecionado',metrics.period,periodLabel)}${metricCard('Total de acessos',metrics.total,'Todos os acessos do site')}${metricCard('WhatsApp no período',metrics.whatsappClicks,'Cliques registrados no intervalo','whatsapp')}`;
  view.innerHTML=`<div class="analyticsToolbar"><div><strong>Visualização de acessos</strong><span>Escolha o período para comparar o site inteiro e o link da bio.</span></div><div class="dateFilter"><label>De <input id="metricsFrom" type="date" value="${metricsFilter.from}"></label><label>Até <input id="metricsTo" type="date" value="${metricsFilter.to}"></label><button class="btn primary small" id="applyMetricsBtn">Aplicar período</button><button class="btn small" id="clearMetricsBtn">Limpar</button></div></div><section class="analyticsSection"><div class="analyticsSectionHead"><strong>Acessos gerais do site</strong><span>Todos os visitantes, independentemente da origem.</span></div><div class="metricGrid">${cards()}</div></section><section class="analyticsSection bioAnalytics"><div class="analyticsSectionHead"><strong>Acessos pelo link da bio</strong><span>Instagram · campanha link_bio</span></div><div class="metricGrid">${cards('bio')}</div></section><div class="dashboardNote"><strong>Como excluir seus testes da leitura</strong><br>Escolha uma data inicial e final. O histórico não é apagado; apenas o período exibido é alterado.</div>`;
  $('#applyMetricsBtn').onclick=()=>{const from=$('#metricsFrom').value,to=$('#metricsTo').value;if((from&&!to)||(!from&&to)||from>to){toast('Informe um período válido.');return}metricsFilter={from,to};loadMetrics()};
  $('#clearMetricsBtn').onclick=()=>{metricsFilter={from:'',to:''};loadMetrics()};
}

function isPromotion(p){return Boolean(p.promocaoAtiva&&Number(p.preco)>0&&Number(p.precoPromocional)>0&&Number(p.precoPromocional)<Number(p.preco))}
function productValueMarkup(product){
  if(!(Number(product.preco)>0))return '<span class="muted">Solicite orçamento</span>';
  if(isPromotion(product))return `<span class="oldValue">${brl(product.preco)}</span><span class="priceText">${brl(product.precoPromocional)}</span>`;
  return `<span class="priceText">${brl(product.preco)}</span>`;
}
function productThumb(product){return product.imagem?`<img class="productThumb" src="${esc(product.imagem)}" alt="">`:'<span class="productThumb placeholder">SEM FOTO</span>'}
function renderProducts(){
  const products=state.produtos.filter(product=>!product.arquivado).sort((a,b)=>(Number(a.ordem)||999)-(Number(b.ordem)||999));
  const content=products.length?`<div class="tableWrap"><table><thead><tr><th>Produto</th><th>Descrição</th><th>Valor</th><th>Publicação</th><th>Ações</th></tr></thead><tbody>${products.map(product=>`<tr><td><div class="productCell">${productThumb(product)}<div><span class="code">${esc(product.codigo||'Sem código')}</span><span class="category">${esc(product.categoria||'Produto')}</span></div></div></td><td>${esc(product.descricaoPublica||product.descricao||'—')}</td><td>${productValueMarkup(product)}${product.promocaoAtiva?`<div><span class="pill promo">Promoção${product.freteGratisCuiaba?' + frete Cuiabá':''}</span></div>`:''}</td><td><span class="pill ${product.siteAtivo!==false?'live':''}">${product.siteAtivo!==false?'No site':'Oculto'}</span></td><td><div class="actions"><button class="btn small" data-share-product="${esc(product.codigo||'')}">Copiar link</button><button class="btn small" data-edit-product="${esc(product.id)}">Editar</button><button class="btn small danger" data-archive-product="${esc(product.id)}">Apagar</button></div></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty"><strong>Nenhum produto cadastrado</strong>Cadastre o primeiro portão, porta ou lixeira para publicar no site.</div>';
  $('#view-produtos').innerHTML=`<div class="sectionCard"><div class="sectionTools"><div><h2>Catálogo</h2><p>Os códigos são gerados automaticamente e não voltam a ser usados.</p></div><button class="btn primary" id="newProductBtn">+ Cadastrar produto</button></div>${content}</div>`;
  $('#newProductBtn').onclick=()=>openProductEditor();
  $$('[data-share-product]').forEach(button=>button.onclick=()=>copyProductLink(button.dataset.shareProduct));
  $$('[data-edit-product]').forEach(button=>button.onclick=()=>openProductEditor(button.dataset.editProduct));
  $$('[data-archive-product]').forEach(button=>button.onclick=()=>archiveProduct(button.dataset.archiveProduct));
}
function publicSiteOrigin(){
  const current=new URL(window.location.href);
  if(current.hostname.startsWith('painel.'))current.hostname=current.hostname.slice(7);
  return current.origin;
}
async function copyProductLink(code){
  const link=new URL(`/?produto=${encodeURIComponent(code)}`,publicSiteOrigin()).href;
  try{await navigator.clipboard.writeText(link);toast('Link individual copiado.')}catch{window.prompt('Copie o link do produto:',link)}
}
function nextProductCode(category){
  const prefix=codePrefixes[category]||'POR';
  const regex=new RegExp(`^${prefix}-(\\d+)$`,'i');
  const max=state.produtos.reduce((highest,product)=>{const match=String(product.codigo||'').match(regex);return match?Math.max(highest,Number(match[1])||0):highest},0);
  return `${prefix}-${String(max+1).padStart(4,'0')}`;
}
function openProductEditor(productId=''){
  const existing=state.produtos.find(product=>product.id===productId);
  const product=existing||{id:uid('prd'),categoria:'Portão',codigo:nextProductCode('Portão'),imagem:'',descricaoPublica:'',preco:'',promocaoAtiva:false,precoPromocional:'',freteGratisCuiaba:false,siteAtivo:true};
  const image=product.imagem?`<img src="${esc(product.imagem)}" alt="Imagem do produto">`:'A imagem aparecerá aqui';
  modal(`<div class="modalHead"><strong>${existing?'Editar produto':'Cadastrar produto'}</strong><button class="iconBtn" id="closeEditorBtn" aria-label="Fechar">×</button></div><div class="modalBody"><div class="formGrid"><label class="field"><span>Categoria</span><select id="pCategory" ${existing?'disabled':''}><option value="Portão" ${product.categoria==='Portão'?'selected':''}>Portão</option><option value="Porta" ${product.categoria==='Porta'?'selected':''}>Porta</option><option value="Lixeira" ${product.categoria==='Lixeira'?'selected':''}>Lixeira</option></select></label><label class="field"><span>Código automático</span><input id="pCode" value="${esc(product.codigo||nextProductCode(product.categoria||'Portão'))}" disabled><small class="help">O código não pode ser alterado e nunca será reutilizado.</small></label><div class="field full"><span>Foto do produto</span><div class="imageEditor"><div class="imagePreview" id="imagePreview">${image}</div><div><input id="pImage" type="file" accept="image/jpeg,image/png,image/webp"><input id="pImageUrl" type="hidden" value="${esc(product.imagem||'')}"><div class="uploadStatus" id="uploadStatus">JPG, PNG ou WebP de até 3 MB.</div></div></div></div><label class="field full"><span>Descrição que aparecerá no site</span><textarea id="pDescription" maxlength="500" placeholder="Descreva somente o que o cliente precisa saber sobre este produto.">${esc(product.descricaoPublica||product.descricao||'')}</textarea></label><label class="field"><span>Valor</span><input id="pPrice" type="number" min="0" step="0.01" value="${Number(product.preco)>0?Number(product.preco):''}" placeholder="Deixe vazio para orçamento"><small class="help">Se ficar vazio, o site mostrará “Solicite orçamento”.</small></label><div class="switchRow"><input id="pVisible" type="checkbox" ${product.siteAtivo!==false?'checked':''}><label for="pVisible"><strong>Exibir no site</strong><small>Desmarque para manter o cadastro oculto.</small></label></div><div class="switchRow field full"><input id="pPromotion" type="checkbox" ${product.promocaoAtiva?'checked':''}><label for="pPromotion"><strong>Produto em promoção</strong><small>Ative para informar um valor promocional.</small></label></div><div class="promoOptions" id="promotionOptions" ${product.promocaoAtiva?'':'hidden'}><label class="field"><span>Valor da promoção</span><input id="pPromoPrice" type="number" min="0" step="0.01" value="${Number(product.precoPromocional)>0?Number(product.precoPromocional):''}" placeholder="0,00"></label><div class="switchRow"><input id="pFreeCuiaba" type="checkbox" ${product.promocaoAtiva&&product.freteGratisCuiaba?'checked':''}><label for="pFreeCuiaba"><strong>Frete grátis para Cuiabá</strong><small>Vale somente para esta promoção. Se não marcar, Cuiabá continua R$ 100,00.</small></label></div></div></div></div><div class="modalFoot"><button class="btn" id="cancelProductBtn">Cancelar</button><button class="btn primary" id="saveProductBtn">Salvar produto</button></div>`);
  $('#closeEditorBtn').onclick=closeModal;$('#cancelProductBtn').onclick=closeModal;
  $('#pCategory').onchange=()=>{$('#pCode').value=nextProductCode($('#pCategory').value)};
  $('#pPromotion').onchange=togglePromotionOptions;
  $('#pImage').onchange=uploadProductImage;
  $('#saveProductBtn').onclick=()=>saveProduct(product.id,Boolean(existing));
}
function togglePromotionOptions(){
  const active=$('#pPromotion').checked;
  $('#promotionOptions').hidden=!active;
  if(!active){$('#pFreeCuiaba').checked=false;$('#pFreeCuiaba').disabled=true}else $('#pFreeCuiaba').disabled=false;
}
async function uploadProductImage(event){
  const file=event.target.files?.[0];if(!file)return;
  const status=$('#uploadStatus');status.textContent='Enviando imagem...';event.target.disabled=true;
  try{
    const form=new FormData();form.append('scope','public');form.append('file',file);
    const result=await api('upload',{method:'POST',body:form});
    $('#pImageUrl').value=result.url;$('#imagePreview').innerHTML=`<img src="${esc(result.url)}" alt="Imagem do produto">`;status.textContent='Imagem enviada com sucesso.';
  }catch(error){status.textContent=error.message;toast(error.message)}finally{event.target.disabled=false}
}
async function saveProduct(productId,exists){
  const category=$('#pCategory').value;
  const code=$('#pCode').value||nextProductCode(category);
  const description=$('#pDescription').value.trim();
  const image=$('#pImageUrl').value.trim();
  const priceRaw=$('#pPrice').value.trim();
  const price=priceRaw===''?'':Number(priceRaw);
  const promotion=$('#pPromotion').checked;
  const promoRaw=$('#pPromoPrice').value.trim();
  const promoPrice=promotion&&promoRaw!==''?Number(promoRaw):'';
  if(!description)return toast('Informe a descrição que aparecerá no site.');
  if(!image)return toast('Envie a foto do produto.');
  if(price!==''&&price<=0)return toast('Informe um valor maior que zero ou deixe o campo vazio.');
  if(promotion&&(price===''||!(promoPrice>0)||promoPrice>=price))return toast('Na promoção, informe um valor promocional menor que o valor normal.');
  const current=state.produtos.find(product=>product.id===productId)||{};
  const product={...current,id:productId,categoria:category,codigo:code,nome:`${category} ${code}`,imagem:image,descricao:description,descricaoPublica:description,preco:price,promocaoAtiva:promotion,precoPromocional:promotion?promoPrice:'',freteGratisCuiaba:Boolean(promotion&&$('#pFreeCuiaba').checked),siteAtivo:$('#pVisible').checked,arquivado:false,status:'ativo',ordem:Number(current.ordem)||state.produtos.length+1,updatedAt:new Date().toISOString()};
  if(exists)state.produtos[state.produtos.findIndex(item=>item.id===productId)]=product;else state.produtos.push({...product,createdAt:new Date().toISOString()});
  try{await persistProducts({action:exists?'Produto alterado':'Produto cadastrado',detail:`${code} · ${category}`,collection:'produtos',entityId:productId});closeModal();renderProducts();toast('Produto salvo e catálogo atualizado.')}catch{}
}
async function persistProducts(audit){
  try{
    const response=await api('state',{method:'PUT',body:JSON.stringify({state:{produtos:state.produtos},audit,version:stateVersion})});
    state.produtos=Array.isArray(response.state?.produtos)?response.state.produtos:state.produtos;stateVersion=response.version||stateVersion;
  }catch(error){
    toast(error.message);
    if(error.code==='STATE_CONFLICT'){
      const fresh=await api('state');state.produtos=Array.isArray(fresh.state?.produtos)?fresh.state.produtos:[];stateVersion=fresh.version||'';renderProducts();
    }
    throw error;
  }
}
async function archiveProduct(productId){
  const product=state.produtos.find(item=>item.id===productId);if(!product)return;
  if(!confirm(`Apagar ${product.codigo||'este produto'} do painel e do site? O código ficará reservado e não será reutilizado.`))return;
  product.arquivado=true;product.siteAtivo=false;product.updatedAt=new Date().toISOString();
  try{await persistProducts({action:'Produto arquivado',detail:product.codigo||productId,collection:'produtos',entityId:productId});renderProducts();toast('Produto apagado. O código continua reservado.')}catch{}
}

async function loadUsers(){
  if(!canManageUsers())return;
  try{const response=await api('users');usersCache=response.users||[];renderUsers()}catch(error){toast(error.message)}
}
function renderUsers(){
  const content=usersCache.length?`<div class="tableWrap"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th>Ações</th></tr></thead><tbody>${usersCache.map(user=>`<tr><td><strong>${esc(user.name)}</strong></td><td>${esc(user.email)}</td><td>${roleLabel(user.role)}</td><td><span class="pill ${user.active?'live':''}">${user.active?'Ativo':'Inativo'}</span>${user.mustChangePassword?'<span class="category">Senha temporária</span>':''}</td><td><div class="actions"><button class="btn small" data-edit-user="${esc(user.id)}">Editar</button><button class="btn small" data-reset-user="${esc(user.id)}">Redefinir senha</button></div></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty"><strong>Nenhum usuário encontrado</strong></div>';
  $('#view-usuarios').innerHTML=`<div class="sectionCard"><div class="sectionTools"><div><h2>Acessos individuais</h2><p>Administrador gerencia usuários e produtos. Cadastrador gerencia somente produtos.</p></div><button class="btn primary" id="newUserBtn">+ Cadastrar usuário</button></div>${content}</div>`;
  $('#newUserBtn').onclick=()=>openUserEditor();
  $$('[data-edit-user]').forEach(button=>button.onclick=()=>openUserEditor(button.dataset.editUser));
  $$('[data-reset-user]').forEach(button=>button.onclick=()=>openPasswordReset(button.dataset.resetUser));
}
function openUserEditor(userId=''){
  const existing=usersCache.find(user=>user.id===userId);
  const user=existing||{name:'',email:'',role:'cadastrador',active:true};
  modal(`<div class="modalHead"><strong>${existing?'Editar usuário':'Cadastrar usuário'}</strong><button class="iconBtn" id="closeUserBtn" aria-label="Fechar">×</button></div><div class="modalBody"><div class="formGrid"><label class="field"><span>Nome</span><input id="uName" value="${esc(user.name)}"></label><label class="field"><span>E-mail</span><input id="uEmail" type="email" value="${esc(user.email)}" ${existing?'disabled':''}></label><label class="field"><span>Perfil</span><select id="uRole"><option value="cadastrador" ${user.role!=='administrador'?'selected':''}>Cadastrador</option><option value="administrador" ${user.role==='administrador'?'selected':''}>Administrador</option></select></label><label class="field"><span>Status</span><select id="uActive"><option value="true" ${user.active?'selected':''}>Ativo</option><option value="false" ${!user.active?'selected':''}>Inativo</option></select></label>${existing?'':`<label class="field full"><span>Senha temporária</span><input id="uPassword" type="password" minlength="8" autocomplete="new-password"><small class="help">O usuário deverá trocar essa senha no primeiro acesso.</small></label>`}</div></div><div class="modalFoot"><button class="btn" id="cancelUserBtn">Cancelar</button><button class="btn primary" id="saveUserBtn">Salvar usuário</button></div>`);
  $('#closeUserBtn').onclick=closeModal;$('#cancelUserBtn').onclick=closeModal;$('#saveUserBtn').onclick=()=>saveUser(userId);
}
async function saveUser(userId){
  const body={name:$('#uName').value.trim(),role:$('#uRole').value,active:$('#uActive').value==='true'};
  if(!userId){body.email=$('#uEmail').value.trim();body.password=$('#uPassword').value}
  try{await api(userId?`users/${encodeURIComponent(userId)}`:'users',{method:userId?'PUT':'POST',body:JSON.stringify(body)});closeModal();if(userId===currentUser.id){location.reload();return}await loadUsers();toast('Usuário salvo.')}catch(error){toast(error.message)}
}
function openPasswordReset(userId){
  const user=usersCache.find(item=>item.id===userId);
  modal(`<div class="modalHead"><strong>Redefinir senha</strong><button class="iconBtn" id="closeResetBtn" aria-label="Fechar">×</button></div><div class="modalBody"><p class="muted">Usuário: <strong>${esc(user?.name||'')}</strong></p><label class="field"><span>Nova senha temporária</span><input id="resetPassword" type="password" minlength="8" autocomplete="new-password"></label><div class="notice">As sessões desse usuário serão encerradas e a troca da senha será obrigatória no próximo acesso.</div></div><div class="modalFoot"><button class="btn" id="cancelResetBtn">Cancelar</button><button class="btn primary" id="saveResetBtn">Redefinir senha</button></div>`);
  $('#closeResetBtn').onclick=closeModal;$('#cancelResetBtn').onclick=closeModal;$('#saveResetBtn').onclick=()=>resetPassword(userId);
}
async function resetPassword(userId){try{await api(`users/${encodeURIComponent(userId)}/reset-password`,{method:'POST',body:JSON.stringify({password:$('#resetPassword').value})});closeModal();await loadUsers();toast('Senha temporária redefinida.')}catch(error){toast(error.message)}}

$('#bootstrapBtn').onclick=bootstrap;
$('#loginBtn').onclick=login;
$('#loginPassword').addEventListener('keydown',event=>{if(event.key==='Enter')login()});
$('#logoutBtn').onclick=logout;$('#mobileLogoutBtn').onclick=logout;
$$('.navBtn').forEach(button=>button.onclick=()=>switchView(button.dataset.view));
$('#modal').addEventListener('click',event=>{if(event.target===$('#modal')&&currentUser&&!currentUser.mustChangePassword)closeModal()});
$('#modal').addEventListener('cancel',event=>{if(currentUser?.mustChangePassword)event.preventDefault()});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('#modal').open&&currentUser&&!currentUser.mustChangePassword)closeModal()});

if('serviceWorker' in navigator)navigator.serviceWorker.getRegistrations().then(registrations=>registrations.forEach(registration=>registration.unregister())).catch(()=>{});

window.closeModal=closeModal;
initAuth();
