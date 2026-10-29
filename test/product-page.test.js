import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet } from '../functions/produto/[codigo].js';
const data = {
  empresa:{whatsapp:'556536844696'},
  produtos:[
    {id:'prd001',codigo:'POR-0002',nome:'Portão chapa ondulada',categoria:'Portão',siteAtivo:true,arquivado:false,status:'ativo',preco:1800,imagem:'/api/media/public/photo.jpeg',descricaoPublica:'Medida 3,10 x 2,10',galeria:[]},
    {id:'prd002',codigo:'POR-0003',nome:'Arquivado',siteAtivo:false,arquivado:true,status:'ativo',preco:1900}
  ]
};
const ctx=(code,search='',state=data)=>({request:new Request('https://universal.example/produto/'+code+search),params:{codigo:code},env:{DB:{prepare:()=>({first:async()=>({data:JSON.stringify(state)})})}}});
test('produto público com URL, foto, preço e WhatsApp',async()=>{
  const res=await onRequestGet(ctx('POR-0002'));const body=await res.text();
  assert.equal(res.status,200);
  for(const t of ['Portão chapa ondulada','POR-0002','R$\u00a01.800,00','/api/media/public/photo.jpeg','https://wa.me/556536844696']) assert.match(body,new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});
test('produto arquivado dá 404',async()=>assert.equal((await onRequestGet(ctx('POR-0003'))).status,404));
test('Black Friday não inventa promoção',async()=>{
 const html=await(await onRequestGet(ctx('POR-0002','?origem=black-friday'))).text();
 assert.match(html,/oferta Black Friday deste item não está disponível/i);
 assert.doesNotMatch(html,/OFERTA BLACK FRIDAY<\/span>/);
});
test('Black Friday selecionada usa o preço especial no WhatsApp',async()=>{
 const state={...data,blackFriday:{ativo:true,produtos:[{produtoId:'prd001',precoEspecial:1299,quantidade:2}]}};
 const html=await(await onRequestGet(ctx('POR-0002','?origem=black-friday',state))).text();
 assert.match(html,/OFERTA BLACK FRIDAY/);
 assert.match(html,/1.299,00/);
 assert.match(html,/2 unidade/);
 assert.match(html,/origem%3Dblack-friday/);
});
test('HTML escapa título e descrição',async()=>{
 const state={...data,produtos:[{...data.produtos[0],nome:'<script>alert(1)</script>'}]};
 const html=await(await onRequestGet(ctx('POR-0002','',state))).text();
 assert.doesNotMatch(html,/<script>alert\(1\)<\/script>/);
 assert.match(html,/&lt;script&gt;/);
});
