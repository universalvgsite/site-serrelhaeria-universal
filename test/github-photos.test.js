import test from 'node:test';
import assert from 'node:assert/strict';
import {photoType,photoBase64,uploadPublicPhoto,serveLegacyPublicPhoto,onRequest} from '../functions/api/[[path]].js';
const jpg=new Uint8Array([255,216,255,224,1,2,3]);
const file=new File([jpg],'imagem.jpg',{type:'image/jpeg'});
const request=new Request('https://universalserralheria.com.br/api/media/public/123.jpg');
const env={GITHUB_PHOTOS_TOKEN:'test-token',SUPABASE_URL:'https://example.supabase.co',SUPABASE_SECRET_KEY:'old-secret'};
test('base64 correto inclusive em vários blocos e identificação do MIME',()=>{
  const data=Uint8Array.from({length:600001},(_,i)=>i%256);
  assert.equal(photoBase64(data),Buffer.from(data).toString('base64'));
  assert.equal(photoType(jpg),'image/jpeg');assert.equal(photoType(new Uint8Array([1,2,3])),'');
  assert.equal(photoType(new Uint8Array([82,73,70,70,0,0,0,0,87,69,66,80])),'image/webp');
});
test('grava somente na pasta pública do repositório e devolve caminho estático sem segredo',async()=>{
  const original=globalThis.fetch;
  try{
    globalThis.fetch=async (url,opts)=>{
      assert.match(url,/^https:\/\/api\.github\.com\/repos\/universalvgsite\/site-serrelhaeria-universal\/contents\/public\/fotos-produtos\/gh-[\w-]+\.jpg$/);
      assert.equal(opts.method,'PUT');assert.equal(opts.headers.authorization,'Bearer test-token');
      const body=JSON.parse(opts.body);assert.equal(body.branch,'main');assert.equal(body.content,Buffer.from(jpg).toString('base64'));
      return new Response('{}',{status:201});
    };
    const res=await uploadPublicPhoto({env},file);assert.equal(res.status,200);const body=await res.json();
    assert.match(body.url,/^\/fotos-produtos\/gh-[\w-]+\.jpg$/);assert.equal(body.pendingDeploy,true);assert.doesNotMatch(JSON.stringify(body),/test-token/);
  }finally{globalThis.fetch=original}
});
test('sem segredo, arquivo falso, grande demais e erro de gravação não retornam sucesso',async()=>{
  assert.equal((await uploadPublicPhoto({env:{}},file)).status,503);
  assert.equal((await uploadPublicPhoto({env},new File(['<html>'],'x.jpg',{type:'image/jpeg'}))).status,415);
  assert.equal((await uploadPublicPhoto({env},new File([new Uint8Array(700000)],'x.jpg',{type:'image/jpeg'}))).status,413);
  const original=globalThis.fetch;try{globalThis.fetch=async()=>new Response('{}',{status:403});assert.equal((await uploadPublicPhoto({env},file)).status,502)}finally{globalThis.fetch=original}
});
test('foto antiga recuperada redireciona ao Pages sem consultar banco ou Supabase',async()=>{
  const res=await onRequest({request,env:{ASSETS:{fetch:async req=>{assert.equal(new URL(req.url).pathname,'/fotos-produtos/123.jpg');return new Response(null,{headers:{'content-type':'image/jpeg'}})}}}});
  assert.equal(res.status,302);assert.equal(res.headers.get('location'),'/fotos-produtos/123.jpg');
});
test('fallback somente para bucket público e não confunde HTML com imagem',async()=>{
  const res=await serveLegacyPublicPhoto({request,env:{...env,ASSETS:{fetch:async()=>new Response('<html>',{headers:{'content-type':'text/html'}})}}},'123.jpg');
  assert.equal(res.status,302);assert.equal(res.headers.get('location'),'https://example.supabase.co/storage/v1/object/public/universal-produtos/123.jpg');
  assert.equal((await serveLegacyPublicPhoto({request,env},'../segredo.jpg')).status,404);
  assert.equal((await serveLegacyPublicPhoto({request,env:{}},'123.jpg')).status,404);
});
