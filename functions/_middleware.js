export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.hostname.toLowerCase().startsWith('painel.') && url.pathname === '/') {
    url.pathname = '/painel/';
    return Response.redirect(url.toString(), 302);
  }
  return context.next();
}
