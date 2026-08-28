const fallback={
  whatsapp:'556536844696',
  telefone:'(65) 3684-4696',
  endereco:'Av. Senador Filinto Müller, 3223 - Jardim Paula II, Várzea Grande - MT'
};

function whatsappUrl(number){
  const message='Olá! Vim pelo link da bio da Serralheria e Metalúrgica Universal e gostaria de solicitar um orçamento.';
  return `https://wa.me/${String(number||fallback.whatsapp).replace(/\D/g,'')}?text=${encodeURIComponent(message)}`;
}

function phoneUrl(number){
  const digits=String(number||fallback.whatsapp).replace(/\D/g,'');
  return `tel:+${digits.startsWith('55')?digits:`55${digits}`}`;
}

function whatsappLabel(number){
  const raw=String(number||fallback.whatsapp).replace(/\D/g,'');
  const digits=raw.startsWith('55')?raw.slice(2):raw;
  if(digits.length===10)return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
  if(digits.length===11)return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  return fallback.telefone;
}

function mapsUrl(address){
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address||fallback.endereco)}`;
}

async function track(eventType){
  try{
    await fetch('/api/track',{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
        eventType,
        source:'instagram',
        medium:'bio',
        campaign:'link_bio',
        page:location.href,
        referrer:document.referrer
      })
    });
  }catch{}
}

async function init(){
  let company=fallback;
  try{
    const response=await fetch('/api/catalog',{cache:'no-store'});
    if(response.ok){
      const data=await response.json();
      company={...fallback,...(data.empresa||{})};
    }
  }catch{}

  const whatsapp=document.querySelector('#whatsappLink');
  const phone=document.querySelector('#phone');
  const address=document.querySelector('#address');
  const maps=document.querySelector('#mapsLink');

  whatsapp.href=whatsappUrl(company.whatsapp);
  phone.href=phoneUrl(company.whatsapp||company.telefone);
  phone.textContent=whatsappLabel(company.whatsapp);
  address.textContent=company.endereco||fallback.endereco;
  maps.href=mapsUrl(company.endereco);

  document.querySelectorAll('[data-event]').forEach(link=>{
    link.addEventListener('click',()=>track(link.dataset.event));
  });
  track('bio_page_view');
}

init();
