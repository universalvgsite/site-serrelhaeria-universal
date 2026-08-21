(function(){
  const whatsapp='556536844696';
  const message='Olá! Vim pela página de estruturas metálicas da Serralheria e Metalúrgica Universal. Gostaria de solicitar uma avaliação para meu projeto. Cidade: ____. Tipo de estrutura: ____. Medidas aproximadas: ____.';
  const url=`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
  document.querySelectorAll('.wa-structure').forEach(link=>{
    link.href=url;
    link.target='_blank';
    link.rel='noopener';
    link.addEventListener('click',()=>{
      try{fetch('/api/track',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({eventType:'whatsapp_click',page:location.href,leadType:'structure'})})}catch{}
    });
  });
  const mobile=document.querySelector('#mobileBtn'),menu=document.querySelector('#menu');
  if(mobile&&menu)mobile.addEventListener('click',()=>menu.classList.toggle('open'));
  document.querySelectorAll('#menu a').forEach(link=>link.addEventListener('click',()=>menu?.classList.remove('open')));
  const year=document.querySelector('#year');if(year)year.textContent=String(new Date().getFullYear());
})();
