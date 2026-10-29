# BLACK FRIDAY 2026 — integração no projeto existente

Esta pasta é o projeto **completo** (site + painel + landing page), não apenas a landing page. Publique **a pasta-raiz do projeto** no **mesmo repositório GitHub** já conectado à Cloudflare Pages. Mantenha a raiz do repositório contendo `public/`, `functions/`, `package.json` e `schema.sql` (não envie um diretório a mais acima deles).

## Antes de publicar
1. Faça download de um backup ZIP do repositório atual, anote o commit da última versão funcional e faça um backup/exportação do D1 de produção.
2. Confirme que o repositório GitHub é o da **Serralheria Universal**, não o de outro projeto.
3. No Cloudflare Pages mantenha **exatamente o mesmo projeto**, o binding D1 `DB` existente e as variáveis Supabase existentes. **Não crie outro banco. Não execute um reset.**
4. Build command vazio; output directory `public`; Functions em `functions/`.
5. Publique um commit. Aguarde o deploy do Pages e valide as rotas abaixo.

## Como cadastrar promoções
Acesse `/painel/`, entre com **a conta existente**, abra Produtos → Editar um portão. A seção "BLACK FRIDAY — SOMENTE PORTÕES" permite marcar a participação e informar o preço **exclusivo da campanha**. O preço precisa ser maior que zero e menor que o preço normal. Salve o produto. Não é necessário habilitar a promoção normal; ambas são independentes.

- Produtos de outras categorias, arquivados, ocultos, indisponíveis, sem foto ou sem valor válido **não entram** na landing page.
- Enquanto nenhum portão estiver marcado, a landing page exibirá a mensagem "Em breve". Nenhum item fictício será mostrado.
- Para retirar da campanha, desmarque a opção no painel e salve: o produto permanece no catálogo.
- O nome/código do portão será incluído automaticamente na mensagem do WhatsApp da campanha.

## Links de teste
- Site principal: `/` — contém botão e menu Black Friday.
- Landing page: `/black-friday/` — somente a campanha, sem menu do catálogo.
- Painel: `/painel/` — mesmo login, mesma base.
- API: `/api/black-friday` — JSON público apenas com portões autorizados.

## Testes de validação depois do deploy
- Confirme que login, imagens, links individuais, contador de visitas, usuários, produtos e promoções antigas permanecem.
- Marque um portão e verifique a landing; abra o WhatsApp e confirme nome/código e identificação Black Friday.
- Desmarque esse portão e confirme que desaparece da landing, mas permanece no site principal.
- Teste em **iPhone real**: reprodução com áudio, transparência, enquadramento das mãos e botão play. WebM com transparência pode não funcionar em algumas versões do Safari; a revisão no aparelho é obrigatória antes de anunciar o link.
- Abra `/api/black-friday` em janela anônima e verifique que **não expõe dados de usuários**.

## Estrutura e salvaguardas
- Nenhuma tabela nova no D1; campos adicionais (`blackFridayAtiva`, `precoBlackFriday`) dentro dos produtos no `app_state` original.
- Não foram alteradas senhas, sessões, identificadores de produtos, números de códigos ou módulos antigos.
- Registro de visitas e cliques no WhatsApp usa a tabela `tracking_events` existente com `campaign=black_friday_2026`.
- Campanha não é publicada automaticamente: só estará pública após você enviar estes arquivos ao repositório correto e a Cloudflare concluir o deploy.
