(() => {
  const links=document.querySelectorAll('.bfMenuLink,.bfSiteButton');
  const display=active=>links.forEach(el=>{el.hidden=!active;});
  window.UniversalBF.watch(null,()=>display(false),()=>display(true),display);
})();
