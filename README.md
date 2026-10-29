# Serralheria Universal — URLs individuais de produtos

**Escopo**: catálogo do site principal e landing page da Black Friday, sem mudar o visual aprovado ou substituir o painel e os dados.

## Integração — arquivos novos

1. Copiar `functions/produto/[codigo].js` para `functions/produto/[codigo].js` do projeto original (Cloudflare Pages). Trata as URLs `/produto/POR-0002`, `/produto/PTA-0001` etc. Usa binding D1 `DB`, tabela `app_state`, campos `produtos` e `empresa`.
2. Copiar `public/product-links.js` para `public/product-links.js` do projeto original.
3. Inserir **antes de `</body>`** em `public/index.html` e em `public/black-friday/index.html`:

   ```html
   <script defer src="/product-links.js"></script>
   ```

4. Para assegurar link em **todos** os cards, o elemento raiz do card deve ter `data-codigo="POR-0002"` (ou `data-produto-id="<id-real>"`). O script tenta localizar os códigos `POR-0002` e `PTA-0001` no texto do card quando falta o atributo. O melhor modo de integrar ao `render` existente é, no momento de criar cada card:

   ```js
   card.dataset.codigo = produto.codigo;
   // se o script já tiver carregado:
   window.UniversalProductLinks?.conectarCard(card, produto);
   ```

5. Publicar pelo GitHub / Cloudflare Pages. O pacote **não** deve substituir `functions/api/[[path]].js`, a pasta `public/painel`, banco D1 ou dados.

## URL e WhatsApp

Catálogo: `/produto/POR-0002`.

Black Friday: `/produto/POR-0002?origem=black-friday`.

A página consulta **os dados atuais do D1 a cada abertura**: foto ampliável, galeria, nome, código, descrição, valor do catálogo e WhatsApp com a mensagem preenchida. Sem duplicar produtos ou preços em arquivos estáticos. Não vende diretamente nem inclui frete ou instalação que não estejam no preço registrado.

## Atenção: compatibilidade da promoção Black Friday

O backup D1 disponível contém os campos do catálogo, mas NÃO apresenta o esquema exato da nova função Black Friday implementada no ZIP de 28/10/2026. Este pacote reconhece preliminarmente as estruturas `state.blackFriday`, `state.black_friday`, `state.campanhaBlackFriday`, listas `produtos`, `itens` ou `ofertas`, e preços especiais `precoBlackFriday`, `precoEspecial`, `precoPromocional`, `valorPromocional`, `precoOferta`, `valorOferta`. **É necessário conferir o esquema efetivamente utilizado no projeto antes de publicar**, ajustando a função `ofertaBlackFriday` conforme os nomes reais.

Por segurança, se a oferta da campanha não puder ser identificada ou se a Black Friday estiver desativada, **nenhum preço promocional é inventado**: exibe o preço regular e informa que a oferta não está disponível. Nunca substitui o valor normal do produto no banco.

## Limitações e verificação

O ZIP principal da landing page estava identificado na Library, mas o acesso aos seus bytes foi bloqueado neste ambiente. Por isso este é um **patch de integração, não o ZIP final do site integrado**. É preciso integrá-lo aos arquivos originais e verificar os seletores reais dos cards e o objeto Black Friday.

Antes de colocar no ar testar: (a) link individual em produto do catálogo; (b) link individual em produto da Black Friday com preço promocional correto; (c) imagem ampliada no iPhone; (d) mensagem no WhatsApp com código, valor e URL; (e) campanha desativada sem preço antigo; (f) outros cards sem regressão visual; (g) banco/painel preservados.
