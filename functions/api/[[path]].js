const STATE_ID = 1;
const SESSION_DAYS = 7;

const DEFAULT_STATE = {
  empresa: {
    nome: 'Metalúrgica e Serralheria Universal',
    razaoSocial: 'Serralheria Universal R. do Vale Pedrosa & Cia LTDA',
    cnpj: '09.360.662/0001-47',
    telefone: '(65) 3684-4696',
    whatsapp: '556536844696',
    endereco: 'Av. Sen. Filinto Müller, 3223 - Jardim Paula II, Várzea Grande - MT, 78135-181',
    logoUrl: '/universal-logo.png',
    validade: 15,
    freteVG: 0,
    freteCuiaba: 100,
    medidaPortao: '3,10 x 2,10 m',
    medidaPorta: '0,80 x 2,10 m',
    adicionalPortaoSocial: '',
    adicionalFechaduraTetra: '',
    ga4Id: '',
    metaPixelId: ''
  },
  clientes: [],
  vendedores: [],
  produtores: [],
  produtos: [],
  estoqueMateriais: [],
  movimentosEstoque: [],
  orcamentos: [],
  pedidos: [],
  auditoria: []
};

// O painel atual é restrito ao catálogo. Os perfis antigos continuam aceitos
// para preservar os usuários do D1, mas passam a operar como Cadastrador.
const ROLE_COLLECTIONS = {
  administrador: ['empresa','produtos'],
  cadastrador: ['produtos'],
  gerente: ['produtos'],
  vendedor: ['produtos'],
  conferencia: ['produtos'],
  entrega: ['produtos']
};

const ROLE_READ_COLLECTIONS = {
  administrador: ['empresa','produtos'],
  cadastrador: ['empresa','produtos'],
  gerente: ['empresa','produtos'],
  vendedor: ['empresa','produtos'],
  conferencia: ['empresa','produtos'],
  entrega: ['empresa','produtos']
};

const json = (data, status=200, extra={}) => new Response(JSON.stringify(data), {
  status,
  headers: {'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extra}
});

function nowISO(){ return new Date().toISOString(); }
function clone(v){ return JSON.parse(JSON.stringify(v)); }
function safeParse(s, fallback){ try{return JSON.parse(s)}catch{return fallback} }
function normalizeEmail(v=''){ return String(v).trim().toLowerCase(); }
function id(prefix='id'){ return `${prefix}_${Date.now().toString(36)}_${crypto.randomUUID().slice(0,8)}`; }
function panelRole(role){ return role==='administrador'?'administrador':'cadastrador'; }
function optionalMoney(value){
  if(value==null||value==='') return '';
  const number=Number(value);
  return Number.isFinite(number)&&number>0?Math.round(number*100)/100:'';
}
function normalizeCompany(company={}){
  return {
    ...company,
    adicionalPortaoSocial:optionalMoney(company.adicionalPortaoSocial),
    adicionalFechaduraTetra:optionalMoney(company.adicionalFechaduraTetra)
  };
}
function normalizeProduct(product={},index=0){
  const allowedCategories=['Portão','Porta','Lixeira'];
  const category=allowedCategories.includes(product.categoria)?product.categoria:'Portão';
  const promotion=Boolean(product.promocaoAtiva);
  const hasSocialGate=category==='Portão'&&product.temPortaoSocial===true;
  const allowsSocialGate=category==='Portão'&&!hasSocialGate&&product.permiteAdicionarPortaoSocial===true;
  const lockType=['normal','tetra'].includes(product.tipoFechadura)?product.tipoFechadura:'';
  return {
    ...product,
    categoria:category,
    codigo:String(product.codigo||'').trim(),
    descricaoPublica:String(product.descricaoPublica||product.descricao||'').trim(),
    preco:product.preco==null||product.preco===''?'':Number(product.preco)||0,
    promocaoAtiva:promotion,
    precoPromocional:product.precoPromocional==null||product.precoPromocional===''?'':Number(product.precoPromocional)||0,
    freteGratisCuiaba:Boolean(promotion&&product.freteGratisCuiaba),
    temPortaoSocial:hasSocialGate,
    permiteAdicionarPortaoSocial:allowsSocialGate,
    tipoFechadura:(category==='Porta'||hasSocialGate)?lockType:'',
    siteAtivo:product.siteAtivo!==false,
    ordem:Number(product.ordem)||index+1
  };
}
function allocateProductCodes(products,previousProducts=[]){
  const prefixes={'Portão':'POR','Porta':'PTA','Lixeira':'LIX'};
  const previousById=new Map(previousProducts.map(product=>[product.id,product]));
  const counters={POR:0,PTA:0,LIX:0};
  for(const product of previousProducts){
    const match=String(product.codigo||'').match(/^(POR|PTA|LIX)-(\d+)$/i);
    if(match)counters[match[1].toUpperCase()]=Math.max(counters[match[1].toUpperCase()],Number(match[2])||0);
  }
  return products.map(product=>{
    const previous=previousById.get(product.id);
    if(previous?.codigo)return {...product,categoria:previous.categoria||product.categoria,codigo:previous.codigo};
    const prefix=prefixes[product.categoria]||'POR';
    counters[prefix]+=1;
    return {...product,codigo:`${prefix}-${String(counters[prefix]).padStart(4,'0')}`};
  });
}

function storageConfig(context){
  const baseUrl=String(context.env.SUPABASE_URL||'').trim().replace(/\/+$/,'');
  const secretKey=String(context.env.SUPABASE_SECRET_KEY||'').trim();
  const publicBucket=String(context.env.SUPABASE_PUBLIC_BUCKET||'universal-produtos').trim();
  const privateBucket=String(context.env.SUPABASE_PRIVATE_BUCKET||'universal-anexos').trim();
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(baseUrl) || !secretKey || !publicBucket || !privateBucket) return null;
  return {baseUrl,secretKey,publicBucket,privateBucket};
}
function storageHeaders(secretKey, extra={}){
  const headers=new Headers({'apikey':secretKey,...extra});
  // As chaves service_role antigas são JWTs. As novas sb_secret_* devem ficar apenas em apikey.
  if(secretKey.split('.').length===3) headers.set('authorization',`Bearer ${secretKey}`);
  return headers;
}
function objectPath(key){ return String(key).split('/').map(encodeURIComponent).join('/'); }
function bucketForScope(config,scope){ return scope==='public'?config.publicBucket:config.privateBucket; }
function storageObjectUrl(config,bucket,key,isPublic=false){
  return `${config.baseUrl}/storage/v1/object/${isPublic?'public/':''}${encodeURIComponent(bucket)}/${objectPath(key)}`;
}

async function sha256(input){
  const data = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function bytesToHex(bytes){ return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(''); }
function hexToBytes(value){
  const hex=String(value||'').trim();
  if(!/^[0-9a-f]+$/i.test(hex) || hex.length%2!==0) throw new Error('Formato de hash inválido.');
  const out=new Uint8Array(hex.length/2);
  for(let i=0;i<out.length;i++) out[i]=Number.parseInt(hex.slice(i*2,i*2+2),16);
  return out;
}
function legacyBase64ToBytes(value){ return Uint8Array.from(atob(value),c=>c.charCodeAt(0)); }
function decodeStoredBytes(value){
  const raw=String(value||'').trim();
  return /^[0-9a-f]+$/i.test(raw) && raw.length%2===0 ? hexToBytes(raw) : legacyBase64ToBytes(raw);
}

async function hashPassword(password, saltB64){
  const salt = saltB64 ? decodeStoredBytes(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), {name:'PBKDF2'}, false, ['deriveBits']);
  // O runtime de produção do Cloudflare Workers limita PBKDF2 a 100.000 iterações.
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2', hash:{name:'SHA-256'}, salt, iterations:100000}, key, 256);
  return {salt: bytesToHex(salt), hash: bytesToHex(new Uint8Array(bits))};
}
async function verifyPassword(password, salt, expected){
  const got = await hashPassword(password, salt);
  const expectedBytes=decodeStoredBytes(expected);
  return timingSafeEqual(got.hash,bytesToHex(expectedBytes));
}
function timingSafeEqual(a,b){
  if(a.length!==b.length) return false;
  let out=0; for(let i=0;i<a.length;i++) out |= a.charCodeAt(i)^b.charCodeAt(i);
  return out===0;
}

async function ensureSchema(DB){
  await DB.batch([
    DB.prepare(`CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL)`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, role TEXT NOT NULL,
      password_salt TEXT NOT NULL, password_hash TEXT NOT NULL, permissions TEXT NOT NULL DEFAULT '{}',
      active INTEGER NOT NULL DEFAULT 1, must_change_password INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL,
      user_agent TEXT, ip_hint TEXT
    )`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS tracking_events (
      id TEXT PRIMARY KEY, event_type TEXT NOT NULL, product_id TEXT, source TEXT, medium TEXT, campaign TEXT,
      content TEXT, term TEXT, fbclid TEXT, page TEXT, referrer TEXT, created_at TEXT NOT NULL
    )`),
  ]);
  const row = await DB.prepare(`SELECT id FROM app_state WHERE id=?`).bind(STATE_ID).first();
  if(!row) await DB.prepare(`INSERT INTO app_state (id,data,updated_at) VALUES (?,?,?)`).bind(STATE_ID, JSON.stringify(DEFAULT_STATE), nowISO()).run();
}

async function getStateRecord(DB){
  const row = await DB.prepare(`SELECT data,updated_at FROM app_state WHERE id=?`).bind(STATE_ID).first();
  const raw = safeParse(row?.data, clone(DEFAULT_STATE));
  const state = {
    ...clone(DEFAULT_STATE),
    ...raw,
    empresa:normalizeCompany({...DEFAULT_STATE.empresa,...(raw.empresa||{})}),
    clientes:Array.isArray(raw.clientes)?raw.clientes:[],
    vendedores:Array.isArray(raw.vendedores)?raw.vendedores:[],
    produtores:Array.isArray(raw.produtores)?raw.produtores:[],
    produtos:Array.isArray(raw.produtos)?raw.produtos.map(normalizeProduct):[],
    estoqueMateriais:Array.isArray(raw.estoqueMateriais)?raw.estoqueMateriais:[],
    movimentosEstoque:Array.isArray(raw.movimentosEstoque)?raw.movimentosEstoque:[],
    orcamentos:Array.isArray(raw.orcamentos)?raw.orcamentos:[],
    pedidos:Array.isArray(raw.pedidos)?raw.pedidos:[],
    auditoria:Array.isArray(raw.auditoria)?raw.auditoria:[]
  };
  return {state,version:row?.updated_at||''};
}
async function getState(DB){ return (await getStateRecord(DB)).state; }
function visibleState(state,user){
  const keys=ROLE_READ_COLLECTIONS[user?.role]||[];
  const out={};
  for(const key of keys) out[key]=clone(state[key]);
  if(!out.empresa) out.empresa=clone(DEFAULT_STATE.empresa);
  if(!out.produtos) out.produtos=[];
  return out;
}

async function getSession(context){
  const cookie = context.request.headers.get('cookie')||'';
  const token = cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith('universal_session='))?.split('=')[1];
  if(!token) return null;
  const tokenHash = await sha256(token);
  const row = await context.env.DB.prepare(`SELECT s.expires_at,u.id,u.name,u.email,u.role,u.permissions,u.active,u.must_change_password
    FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?`).bind(tokenHash).first();
  if(!row || !row.active || row.expires_at <= nowISO()){
    if(row) await context.env.DB.prepare(`DELETE FROM sessions WHERE token_hash=?`).bind(tokenHash).run();
    return null;
  }
  return {
    id:row.id,name:row.name,email:row.email,role:row.role,
    permissions:safeParse(row.permissions,{}),mustChangePassword:Boolean(row.must_change_password),tokenHash
  };
}

function publicUser(u){ return {id:u.id,name:u.name,email:u.email,role:panelRole(u.role),permissions:{},mustChangePassword:Boolean(u.mustChangePassword)}; }
function requireAuth(user){ if(!user) return json({error:'Não autenticado.'},401); if(user.mustChangePassword) return json({error:'Troque sua senha para continuar.',code:'PASSWORD_CHANGE_REQUIRED'},403); return null; }

function getClientIp(req){
  const ip=req.headers.get('CF-Connecting-IP')||'';
  if(!ip) return '';
  const p=ip.split('.'); return p.length===4?`${p[0]}.${p[1]}.x.x`:ip.slice(0,12);
}

function findEntity(collection, entityId){
  if(!entityId) return collection;
  if(Array.isArray(collection)) return collection.find(x=>x?.id===entityId) ?? null;
  return collection;
}

async function saveState(context, user, incoming, auditMeta={}, expectedVersion=''){
  const rec = await getStateRecord(context.env.DB);
  const before = rec.state;
  if(expectedVersion && rec.version!==expectedVersion){
    throw new Response(JSON.stringify({error:'Os dados foram alterados por outro usuário. O painel foi atualizado; refaça esta alteração.',code:'STATE_CONFLICT'}),{status:409,headers:{'content-type':'application/json'}});
  }
  const allowed = ROLE_COLLECTIONS[user.role]||[];
  const merged = clone(before);
  for(const key of allowed){
    if(!Object.prototype.hasOwnProperty.call(incoming,key)) continue;
    merged[key]=key==='empresa'?{...before.empresa,...(incoming.empresa||{})}:incoming[key];
  }
  merged.empresa=normalizeCompany({...DEFAULT_STATE.empresa,...(merged.empresa||{})});
  merged.produtos=allocateProductCodes((Array.isArray(merged.produtos)?merged.produtos:[]).map(normalizeProduct),before.produtos||[]);

  const col=auditMeta.collection;
  const entityId=auditMeta.entityId;
  const beforeEntity=col&&Object.prototype.hasOwnProperty.call(before,col)?findEntity(before[col],entityId):null;
  const afterEntity=col&&Object.prototype.hasOwnProperty.call(merged,col)?findEntity(merged[col],entityId):null;
  const entry={
    id:id('aud'), at:nowISO(), userId:user.id, userName:user.name, role:user.role,
    action:auditMeta.action||'Alteração no sistema', detail:auditMeta.detail||'',
    collection:col||'', entityId:entityId||'', before:beforeEntity, after:afterEntity
  };
  merged.auditoria=[entry,...(before.auditoria||[])].slice(0,1200);
  const newVersion=nowISO();
  const result=await context.env.DB.prepare(`UPDATE app_state SET data=?, updated_at=? WHERE id=? AND updated_at=?`).bind(JSON.stringify(merged),newVersion,STATE_ID,rec.version).run();
  if(Number(result?.meta?.changes||0)!==1){
    throw new Response(JSON.stringify({error:'Os dados foram alterados por outro usuário. O painel foi atualizado; refaça esta alteração.',code:'STATE_CONFLICT'}),{status:409,headers:{'content-type':'application/json'}});
  }
  return {state:merged,version:newVersion};
}

async function route(context){
  await ensureSchema(context.env.DB);
  const req=context.request, url=new URL(req.url), method=req.method.toUpperCase();
  const path=url.pathname.replace(/^\/api\/?/,'');
  const seg=path.split('/').filter(Boolean).map(decodeURIComponent);
  const user=await getSession(context);

  if(path==='health' && method==='GET') return json({ok:true,service:'Universal',storage:storageConfig(context)?'supabase':'not_configured',time:nowISO()});

  if(path==='bootstrap/status' && method==='GET'){
    const row=await context.env.DB.prepare(`SELECT COUNT(*) c FROM users`).first();
    return json({needsBootstrap:Number(row?.c||0)===0});
  }
  if(path==='bootstrap' && method==='POST'){
    const row=await context.env.DB.prepare(`SELECT COUNT(*) c FROM users`).first();
    if(Number(row?.c||0)>0) return json({error:'Administrador inicial já configurado.'},409);
    const body=await req.json(); const name=String(body.name||'').trim(); const email=normalizeEmail(body.email); const password=String(body.password||'');
    if(name.length<2 || !email.includes('@') || password.length<8) return json({error:'Informe nome, e-mail e senha com pelo menos 8 caracteres.'},400);
    let ph;
    try{ ph=await hashPassword(password) }
    catch(err){ console.error('Falha ao proteger a senha inicial.',err); return json({error:'Falha ao proteger a senha. Atualize a implantação e tente novamente.',code:'BOOTSTRAP_PASSWORD_HASH'},500) }
    const uid=id('usr'); const t=nowISO();
    try{
      await context.env.DB.prepare(`INSERT INTO users (id,name,email,role,password_salt,password_hash,permissions,active,must_change_password,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(uid,name,email,'administrador',ph.salt,ph.hash,'{}',1,0,t,t).run();
    }catch(err){ console.error('Falha ao gravar o administrador inicial.',err); return json({error:'Falha ao gravar o administrador no banco de dados.',code:'BOOTSTRAP_DATABASE_INSERT'},500) }
    return json({ok:true});
  }

  if(path==='login' && method==='POST'){
    const body=await req.json(); const email=normalizeEmail(body.email); const password=String(body.password||'');
    const row=await context.env.DB.prepare(`SELECT * FROM users WHERE email=?`).bind(email).first();
    if(!row || !row.active || !await verifyPassword(password,row.password_salt,row.password_hash)) return json({error:'E-mail ou senha inválidos.'},401);
    const token=crypto.randomUUID()+crypto.randomUUID(); const tokenHash=await sha256(token); const expires=new Date(Date.now()+SESSION_DAYS*86400000).toISOString();
    await context.env.DB.prepare(`INSERT INTO sessions (token_hash,user_id,expires_at,created_at,user_agent,ip_hint) VALUES (?,?,?,?,?,?)`)
      .bind(tokenHash,row.id,expires,nowISO(),(req.headers.get('user-agent')||'').slice(0,180),getClientIp(req)).run();
    const cookie=`universal_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DAYS*86400}`;
    return json({ok:true,user:publicUser({id:row.id,name:row.name,email:row.email,role:row.role,mustChangePassword:Boolean(row.must_change_password)})},200,{'set-cookie':cookie});
  }
  if(path==='logout' && method==='POST'){
    if(user) await context.env.DB.prepare(`DELETE FROM sessions WHERE token_hash=?`).bind(user.tokenHash).run();
    return json({ok:true},200,{'set-cookie':'universal_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'});
  }
  if(path==='me' && method==='GET') return user?json({user:publicUser(user)}):json({error:'Não autenticado.'},401);

  if(path==='change-password' && method==='POST'){
    if(!user) return json({error:'Não autenticado.'},401);
    const body=await req.json(); const password=String(body.password||'');
    if(password.length<8) return json({error:'A nova senha precisa ter pelo menos 8 caracteres.'},400);
    const ph=await hashPassword(password);
    await context.env.DB.prepare(`UPDATE users SET password_salt=?,password_hash=?,must_change_password=0,updated_at=? WHERE id=?`).bind(ph.salt,ph.hash,nowISO(),user.id).run();
    return json({ok:true});
  }

  if(path==='catalog' && method==='GET'){
    const state=await getState(context.env.DB);
    const products=(state.produtos||[]).filter(p=>!p.arquivado && p.siteAtivo!==false && p.status!=='indisponivel').sort((a,b)=>(Number(a.ordem)||999)-(Number(b.ordem)||999));
    const empresa={...state.empresa};
    return json({empresa,products});
  }

  if(path==='track' && method==='POST'){
    const body=await req.json().catch(()=>({}));
    const t={id:id('evt'),event_type:String(body.eventType||'event').slice(0,50),product_id:String(body.productId||'').slice(0,80),source:String(body.source||'').slice(0,120),medium:String(body.medium||'').slice(0,120),campaign:String(body.campaign||'').slice(0,180),content:String(body.content||'').slice(0,180),term:String(body.term||'').slice(0,180),fbclid:String(body.fbclid||'').slice(0,250),page:String(body.page||url.pathname).slice(0,500),referrer:String(body.referrer||'').slice(0,500),created_at:nowISO()};
    await context.env.DB.prepare(`INSERT INTO tracking_events (id,event_type,product_id,source,medium,campaign,content,term,fbclid,page,referrer,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(t.id,t.event_type,t.product_id,t.source,t.medium,t.campaign,t.content,t.term,t.fbclid,t.page,t.referrer,t.created_at).run();
    return json({ok:true});
  }

  if(seg[0]==='media' && method==='GET'){
    const scope=seg[1], key=seg.slice(2).join('/');
    if(!key) return new Response('Not found',{status:404});
    if(scope!=='public') { const er=requireAuth(user); if(er) return er; }
    const config=storageConfig(context);
    if(!config) return new Response('Supabase Storage não configurado.',{status:503});
    const bucket=bucketForScope(config,scope);
    if(scope==='public') return Response.redirect(storageObjectUrl(config,bucket,key,true),302);
    const stored=await fetch(storageObjectUrl(config,bucket,key),{headers:storageHeaders(config.secretKey)});
    if(stored.status===404) return new Response('Not found',{status:404});
    if(!stored.ok){
      console.error('Falha ao ler arquivo privado no Supabase Storage.',stored.status);
      return new Response('Falha ao acessar arquivo.',{status:502});
    }
    const headers=new Headers({'cache-control':'private, no-store'});
    for(const name of ['content-type','content-length','content-disposition','etag']){
      const value=stored.headers.get(name); if(value) headers.set(name,value);
    }
    return new Response(stored.body,{headers});
  }

  const authErr=requireAuth(user); if(authErr) return authErr;

  if(path==='state' && method==='GET'){
    const rec=await getStateRecord(context.env.DB);
    return json({state:visibleState(rec.state,user),version:rec.version,user:publicUser(user)});
  }
  if(path==='state' && method==='PUT'){
    const body=await req.json();
    if(!body?.state) return json({error:'Estado inválido.'},400);
    try{
      const saved=await saveState(context,user,body.state,body.audit||{},String(body.version||''));
      return json({ok:true,state:visibleState(saved.state,user),version:saved.version});
    } catch(e){ if(e instanceof Response) return e; throw e; }
  }

  if(path==='metrics' && method==='GET'){
    const params=new URL(req.url).searchParams;
    const from=/^\d{4}-\d{2}-\d{2}$/.test(params.get('from')||'')?params.get('from'):'';
    const to=/^\d{4}-\d{2}-\d{2}$/.test(params.get('to')||'')?params.get('to'):'';
    const dateFilter=from&&to?` AND date(created_at,'-3 hours') BETWEEN ? AND ?`:'';
    const dateParams=from&&to?[from,to]:[];
    const bio=`source='instagram' AND medium='bio' AND campaign='link_bio'`;
    const count=async(eventType,scope='',extra='',extraParams=[])=>context.env.DB.prepare(`SELECT COUNT(*) total FROM tracking_events WHERE event_type=? ${scope?'AND '+scope:''}${extra}`).bind(eventType,...extraParams).first();
    const todayFilter=` AND date(created_at,'-3 hours')=date('now','-3 hours')`;
    const weekFilter=` AND date(created_at,'-3 hours')>=date('now','-3 hours','-6 days')`;
    const monthFilter=` AND date(created_at,'-3 hours')>=date('now','-3 hours','start of month')`;
    const [today,week,month,total,period,whatsapp,bioToday,bioWeek,bioMonth,bioTotal,bioPeriod,bioWhatsapp]=await Promise.all([
      count('page_view','',''+todayFilter),
      count('page_view','',''+weekFilter),
      count('page_view','',''+monthFilter),
      count('page_view'),
      count('page_view','',dateFilter,dateParams),
      count('whatsapp_click','',dateFilter,dateParams),
      count('page_view',bio,todayFilter),
      count('page_view',bio,weekFilter),
      count('page_view',bio,monthFilter),
      count('page_view',bio),
      count('page_view',bio,dateFilter,dateParams),
      count('whatsapp_click',bio,dateFilter,dateParams)
    ]);
    return json({
      today:Number(today?.total||0),week:Number(week?.total||0),month:Number(month?.total||0),
      total:Number(total?.total||0),period:Number(period?.total||0),
      periodFrom:from||null,periodTo:to||null,whatsappClicks:Number(whatsapp?.total||0),
      bioToday:Number(bioToday?.total||0),bioWeek:Number(bioWeek?.total||0),bioMonth:Number(bioMonth?.total||0),
      bioTotal:Number(bioTotal?.total||0),bioPeriod:Number(bioPeriod?.total||0),bioWhatsappClicks:Number(bioWhatsapp?.total||0)
    });
  }

  if(path==='upload' && method==='POST'){
    const config=storageConfig(context);
    if(!config) return json({error:'Supabase Storage não configurado no Cloudflare.'},503);
    const form=await req.formData(); const file=form.get('file'); let scope=String(form.get('scope')||'private');
    if(scope!=='public') scope='private';
    if(!(file instanceof File)) return json({error:'Arquivo ausente.'},400);
    const maxBytes=scope==='public'?3*1024*1024:12*1024*1024;
    if(file.size>maxBytes) return json({error:`Arquivo excede ${scope==='public'?3:12} MB.`},413);
    const allowed=scope==='public'?['image/jpeg','image/png','image/webp']:['image/jpeg','image/png','image/webp','application/pdf'];
    if(!allowed.includes(file.type)) return json({error:'Tipo de arquivo não permitido.'},415);
    const ext=(file.name.split('.').pop()||'bin').replace(/[^a-z0-9]/gi,'').toLowerCase();
    const key=`${Date.now()}-${crypto.randomUUID().slice(0,10)}.${ext}`;
    const bucket=bucketForScope(config,scope);
    const uploaded=await fetch(storageObjectUrl(config,bucket,key),{
      method:'POST',
      headers:storageHeaders(config.secretKey,{'content-type':file.type,'cache-control':scope==='public'?'86400':'3600','x-upsert':'false'}),
      body:file.stream()
    });
    if(!uploaded.ok){
      console.error('Falha no upload para o Supabase Storage.',uploaded.status);
      return json({error:'Não foi possível armazenar o arquivo. Confira os buckets e as variáveis do Supabase.'},502);
    }
    return json({ok:true,key,scope,url:`/api/media/${scope}/${encodeURIComponent(key)}`,name:file.name,type:file.type,size:file.size});
  }

  if(path==='users' && method==='GET'){
    if(user.role!=='administrador') return json({error:'Acesso restrito ao administrador.'},403);
    const rs=await context.env.DB.prepare(`SELECT id,name,email,role,permissions,active,must_change_password,created_at,updated_at FROM users ORDER BY name`).all();
    return json({users:(rs.results||[]).map(r=>({id:r.id,name:r.name,email:r.email,role:panelRole(r.role),active:Boolean(r.active),mustChangePassword:Boolean(r.must_change_password),createdAt:r.created_at,updatedAt:r.updated_at}))});
  }
  if(path==='users' && method==='POST'){
    if(user.role!=='administrador') return json({error:'Acesso restrito ao administrador.'},403);
    const b=await req.json(); const name=String(b.name||'').trim(), email=normalizeEmail(b.email), role=String(b.role||'cadastrador'), password=String(b.password||'');
    if(name.length<2||!email.includes('@')||password.length<8) return json({error:'Dados inválidos. A senha temporária precisa ter 8 caracteres ou mais.'},400);
    if(!['administrador','cadastrador'].includes(role)) return json({error:'Perfil inválido.'},400);
    const ph=await hashPassword(password), uid=id('usr'), t=nowISO(), perms={};
    try{
      await context.env.DB.prepare(`INSERT INTO users (id,name,email,role,password_salt,password_hash,permissions,active,must_change_password,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(uid,name,email,role,ph.salt,ph.hash,JSON.stringify(perms),1,1,t,t).run();
    }catch{return json({error:'Já existe um usuário com esse e-mail.'},409)}
    return json({ok:true,id:uid});
  }
  if(seg[0]==='users' && seg[1] && method==='PUT'){
    if(user.role!=='administrador') return json({error:'Acesso restrito ao administrador.'},403);
    const uid=seg[1]; const b=await req.json(); const role=String(b.role||'cadastrador');
    if(!['administrador','cadastrador'].includes(role)) return json({error:'Perfil inválido.'},400);
    const target=await context.env.DB.prepare(`SELECT id,role,active FROM users WHERE id=?`).bind(uid).first();
    if(!target) return json({error:'Usuário não encontrado.'},404);
    const active=b.active!==false;
    if(uid===user.id&&!active) return json({error:'Você não pode desativar o próprio acesso.'},400);
    if(target.role==='administrador'&&target.active&&(role!=='administrador'||!active)){
      const admins=await context.env.DB.prepare(`SELECT COUNT(*) total FROM users WHERE role='administrador' AND active=1`).first();
      if(Number(admins?.total||0)<=1) return json({error:'Mantenha pelo menos um administrador ativo.'},400);
    }
    await context.env.DB.prepare(`UPDATE users SET name=?,role=?,permissions=?,active=?,updated_at=? WHERE id=?`).bind(String(b.name||'').trim(),role,'{}',active?1:0,nowISO(),uid).run();
    if(!active) await context.env.DB.prepare(`DELETE FROM sessions WHERE user_id=?`).bind(uid).run();
    return json({ok:true});
  }
  if(seg[0]==='users' && seg[1] && seg[2]==='reset-password' && method==='POST'){
    if(user.role!=='administrador') return json({error:'Acesso restrito ao administrador.'},403);
    const b=await req.json(); const password=String(b.password||''); if(password.length<8) return json({error:'Senha temporária precisa ter pelo menos 8 caracteres.'},400);
    const ph=await hashPassword(password); await context.env.DB.prepare(`UPDATE users SET password_salt=?,password_hash=?,must_change_password=1,updated_at=? WHERE id=?`).bind(ph.salt,ph.hash,nowISO(),seg[1]).run();
    await context.env.DB.prepare(`DELETE FROM sessions WHERE user_id=?`).bind(seg[1]).run(); return json({ok:true});
  }

  return json({error:'Rota não encontrada.'},404);
}

export async function onRequest(context){
  try{return await route(context)}catch(err){
    console.error(err); return json({error:'Erro interno do sistema.'},500);
  }
}
