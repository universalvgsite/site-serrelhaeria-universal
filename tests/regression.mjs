import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const publicSource=read('public/app.js');
const panelSource=read('public/painel/app.js');
const apiSource=read('functions/api/[[path]].js');
const schemaSource=read('schema.sql');

function createBrowserContext(){
  const storage=new Map();
  const context={
    console,
    Intl,
    URL,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    location:{search:'',origin:'https://universalserralheria.com.br',href:'https://universalserralheria.com.br/',hostname:'universalserralheria.com.br'},
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,String(value))},
    document:{querySelector:()=>null,querySelectorAll:()=>[],referrer:'',createElement:()=>({}),head:{appendChild(){}}},
    navigator:{},
    fetch:async()=>({ok:true,json:async()=>({empresa:{},products:[]})})
  };
  context.window=context;
  context.history={replaceState(){}};
  return vm.createContext(context);
}

const publicContext=createBrowserContext();
const publicDefinitions=publicSource.slice(0,publicSource.indexOf("\n$$('.filter')"));
vm.runInContext(publicDefinitions,publicContext,{filename:'public/app.js'});

const data={
  empresa:{whatsapp:'556536844696',adicionalPortaoSocial:700,adicionalFechaduraTetra:200},
  products:[
    {id:'gate_optional',categoria:'Portão',codigo:'POR-0001',preco:4000,temPortaoSocial:false,permiteAdicionarPortaoSocial:true,tipoFechadura:''},
    {id:'gate_included',categoria:'Portão',codigo:'POR-0002',preco:5000,temPortaoSocial:true,permiteAdicionarPortaoSocial:false,tipoFechadura:'normal'},
    {id:'door_normal',categoria:'Porta',codigo:'PTA-0001',preco:2000,tipoFechadura:'normal'},
    {id:'door_tetra',categoria:'Porta',codigo:'PTA-0002',preco:2500,tipoFechadura:'tetra'},
    {id:'promo',categoria:'Portão',codigo:'POR-0003',preco:5000,promocaoAtiva:true,precoPromocional:4000,temPortaoSocial:false,permiteAdicionarPortaoSocial:true,tipoFechadura:''},
    {id:'legacy',categoria:'Portão',codigo:'POR-0004',preco:3000}
  ]
};
vm.runInContext(`DATA=${JSON.stringify(data)}`,publicContext);

const evaluatePublic=expression=>vm.runInContext(expression,publicContext);
const optionalSelection=JSON.parse(evaluatePublic(`JSON.stringify(calculateProductSelection(DATA.products[0],{portaoSocial:true,fechaduraTetra:true}))`));
assert.deepEqual(optionalSelection,{addSocial:true,addTetra:true,socialValue:700,tetraValue:200,extraTotal:900,baseValue:4000,total:4900});
assert.equal(evaluatePublic(`calculateProductSelection(DATA.products[1],{fechaduraTetra:true}).total`),5200);
assert.equal(evaluatePublic(`calculateProductSelection(DATA.products[2],{fechaduraTetra:true}).total`),2200);
assert.equal(evaluatePublic(`hasSelectableAddOns(DATA.products[3])`),false);
assert.equal(evaluatePublic(`calculateProductSelection(DATA.products[4],{portaoSocial:true,fechaduraTetra:true}).total`),4900);
assert.equal(evaluatePublic(`hasSelectableAddOns(DATA.products[5])`),false);

const selectionMessage=evaluatePublic(`productSelectionMessage(DATA.products[0],{portaoSocial:true,fechaduraTetra:true})`);
assert.match(selectionMessage,/Adicionar portão social/);
assert.match(selectionMessage,/Trocar pela fechadura tetra/);
assert.match(selectionMessage,/4\.900,00/);
const legacyMessage=evaluatePublic(`productSelectionMessage(DATA.products[5],{})`);
assert.match(legacyMessage,/Quero comprar o Portão POR-0004 pelo valor/);
assert.doesNotMatch(legacyMessage,/Adicional|Fechadura/);
const addOnMarkup=evaluatePublic(`productAddOnMarkup(DATA.products[0])`);
assert.match(addOnMarkup,/Adicionar portão social/);
assert.match(addOnMarkup,/Trocar pela fechadura tetra/);
assert.doesNotMatch(addOnMarkup.toLowerCase(),/duas fechaduras|três fechaduras|3 fechaduras/);
assert.equal(evaluatePublic(`productShareUrl(DATA.products[0])`),'https://universalserralheria.com.br/?produto=POR-0001');

const apiContext=vm.createContext({
  console,
  crypto:globalThis.crypto,
  TextEncoder,
  Uint8Array,
  Response,
  Headers,
  URL,
  atob:globalThis.atob
});
vm.runInContext(apiSource.slice(0,apiSource.indexOf('export async function onRequest')),apiContext,{filename:'functions/api/[[path]].js'});
const normalize=product=>JSON.parse(vm.runInContext(`JSON.stringify(normalizeProduct(${JSON.stringify(product)}))`,apiContext));
const legacyNormalized=normalize({id:'old',categoria:'Portão',codigo:'POR-0009',preco:3500,imagem:'foto.webp',promocaoAtiva:true,precoPromocional:3200,freteGratisCuiaba:true});
assert.equal(legacyNormalized.temPortaoSocial,false);
assert.equal(legacyNormalized.permiteAdicionarPortaoSocial,false);
assert.equal(legacyNormalized.tipoFechadura,'');
assert.equal(legacyNormalized.imagem,'foto.webp');
assert.equal(legacyNormalized.precoPromocional,3200);
assert.equal(legacyNormalized.freteGratisCuiaba,true);
const gateNormalized=normalize({categoria:'Portão',temPortaoSocial:true,permiteAdicionarPortaoSocial:true,tipoFechadura:'tetra'});
assert.equal(gateNormalized.temPortaoSocial,true);
assert.equal(gateNormalized.permiteAdicionarPortaoSocial,false);
assert.equal(gateNormalized.tipoFechadura,'tetra');
const doorNormalized=normalize({categoria:'Porta',temPortaoSocial:true,permiteAdicionarPortaoSocial:true,tipoFechadura:'normal'});
assert.equal(doorNormalized.temPortaoSocial,false);
assert.equal(doorNormalized.permiteAdicionarPortaoSocial,false);
assert.equal(doorNormalized.tipoFechadura,'normal');
const normalizedCompany=JSON.parse(vm.runInContext(`JSON.stringify(normalizeCompany({adicionalPortaoSocial:'700.129',adicionalFechaduraTetra:-5,telefone:'4696'}))`,apiContext));
assert.equal(normalizedCompany.adicionalPortaoSocial,700.13);
assert.equal(normalizedCompany.adicionalFechaduraTetra,'');
assert.equal(normalizedCompany.telefone,'4696');
assert.deepEqual(Array.from(vm.runInContext(`ROLE_COLLECTIONS.administrador`,apiContext)),['empresa','produtos']);
assert.deepEqual(Array.from(vm.runInContext(`ROLE_COLLECTIONS.cadastrador`,apiContext)),['produtos']);

let storedRow={
  data:JSON.stringify({
    empresa:{whatsapp:'556536844696',adicionalPortaoSocial:''},
    produtos:[{id:'existing',categoria:'Portão',codigo:'POR-0001',preco:4000,imagem:'foto.webp'}],
    clientes:[{id:'client_preserved',nome:'Cliente antigo'}],
    auditoria:[]
  }),
  updated_at:'version-before'
};
apiContext.__db={
  prepare(sql){
    let values=[];
    return {
      bind(...params){values=params;return this},
      async first(){return sql.includes('SELECT data,updated_at FROM app_state')?{...storedRow}:null},
      async run(){
        if(sql.includes('UPDATE app_state SET data=')){
          assert.equal(values[3],'version-before');
          storedRow={data:values[0],updated_at:values[1]};
          return {meta:{changes:1}};
        }
        return {meta:{changes:0}};
      }
    };
  }
};
const savedState=await vm.runInContext(`saveState({env:{DB:__db}},{id:'admin',name:'Admin',role:'administrador'},{empresa:{adicionalPortaoSocial:700,adicionalFechaduraTetra:200}},{action:'Teste',collection:'empresa'},'version-before')`,apiContext);
assert.equal(savedState.state.empresa.adicionalPortaoSocial,700);
assert.equal(savedState.state.empresa.adicionalFechaduraTetra,200);
assert.equal(savedState.state.empresa.whatsapp,'556536844696');
assert.equal(savedState.state.produtos[0].codigo,'POR-0001');
assert.equal(savedState.state.produtos[0].imagem,'foto.webp');
assert.equal(savedState.state.clientes[0].id,'client_preserved');

const panelContext=createBrowserContext();
const panelDefinitions=panelSource.slice(0,panelSource.indexOf("$('#bootstrapBtn')"));
vm.runInContext(panelDefinitions,panelContext,{filename:'public/painel/app.js'});
vm.runInContext(`state={empresa:{adicionalPortaoSocial:700,adicionalFechaduraTetra:200},produtos:[]};currentUser={role:'administrador'}`,panelContext);
assert.match(vm.runInContext(`addOnSettingsMarkup()`,panelContext),/R\$\s*700,00/);
assert.match(vm.runInContext(`addOnSettingsMarkup()`,panelContext),/R\$\s*200,00/);
assert.match(vm.runInContext(`productFeatureSummary({categoria:'Portão',temPortaoSocial:true,tipoFechadura:'tetra'})`,panelContext),/Portão social incluso/);
assert.match(vm.runInContext(`productFeatureSummary({categoria:'Porta',tipoFechadura:'normal'})`,panelContext),/Fechadura normal/);

for(const table of ['app_state','users','sessions','tracking_events'])assert.match(schemaSource,new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
assert.doesNotMatch(apiSource,/DROP\s+TABLE/i);
assert.doesNotMatch(apiSource,/DELETE\s+FROM\s+(app_state|users|tracking_events)/i);
for(const route of ["path==='catalog'","path==='track'","path==='metrics'","path==='users'"])assert.ok(apiSource.includes(route));
for(const invariant of ['Acessos gerais do site','Acessos pelo link da bio','Copiar link','data-edit-product','data-archive-product'])assert.ok(panelSource.includes(invariant));
assert.ok(publicSource.includes("url.searchParams.set('produto',key)"));
assert.ok(panelSource.includes("state:{empresa:nextCompany}"));
assert.ok(panelSource.includes("state:{produtos:state.produtos}"));
assert.doesNotMatch(publicSource.toLowerCase(),/duas fechaduras|três fechaduras|3 fechaduras/);


// Black Friday: não altera promoção normal, usuários nem produtos antigos.
const bfGate=normalize({id:'bf1',categoria:'Portão',codigo:'POR-0042',preco:4000,precoPromocional:3800,promocaoAtiva:true,blackFridayAtiva:true,precoBlackFriday:3100,imagem:'gate.webp'});
assert.equal(bfGate.blackFridayAtiva,true);
assert.equal(bfGate.precoBlackFriday,3100);
assert.equal(bfGate.precoPromocional,3800);
assert.equal(normalize({categoria:'Porta',blackFridayAtiva:true,precoBlackFriday:900}).blackFridayAtiva,false);
assert.equal(normalize({categoria:'Portão',preco:2500}).blackFridayAtiva,false);
assert.ok(apiSource.includes("path==='black-friday'"));
assert.ok(panelSource.includes('pBlackFridayPrice'));
assert.ok(panelSource.includes('pBlackFriday'));
assert.ok(read('public/index.html').includes('href="/black-friday/"'));
assert.ok(read('public/black-friday/index.html').includes('neia_transparente_1080p.webm'));
assert.doesNotMatch(read('public/black-friday/index.html'),/href="\/(estruturas|contato|catalogo)"/);

console.log('Regressão concluída: catálogo, usuários, dados antigos e Black Friday.');
