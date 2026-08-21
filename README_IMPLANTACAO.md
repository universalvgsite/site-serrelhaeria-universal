# Serralheria e Metalúrgica Universal — implantação em produção

Pacote limpo para GitHub e Cloudflare Pages. Ele não contém usuários, clientes, produtos, orçamentos, pedidos, senhas ou mensagens de demonstração.

## O que está incluído

- site público em `/`;
- página independente de estruturas metálicas em `/estruturas/`;
- painel administrativo instalável em `/painel/`;
- API em `/api/*` com Cloudflare Pages Functions;
- banco de dados Cloudflare D1 pelo binding `DB`;
- imagens e documentos no Supabase Storage, separados entre conteúdo público e privado;
- login individual, perfis, permissões e auditoria;
- cadastro de clientes durante a criação do orçamento;
- fluxo simplificado: orçamento gerado → pedido + OS → produção → conferência → entrega;
- controle de material consumido e baixa de estoque;
- romaneio de entrega com quantidade de produtos e situação do pagamento;
- catálogo alimentado pelos produtos reais cadastrados no painel.

## Regras comerciais configuradas

- Portão padrão: **3,10 m × 2,10 m**.
- Porta padrão: **0,80 m × 2,10 m**.
- Várzea Grande: **frete grátis**.
- Cuiabá: **R$ 100,00**.
- Outras cidades: sob consulta.
- Instalação e automatização não inclusas.
- WhatsApp: **(65) 3684-4696**.
- Estruturas metálicas: somente sob medida.

## 1. Enviar ao GitHub

Crie um repositório vazio, por exemplo `serralheria-universal`, extraia este ZIP e envie **o conteúdo da pasta extraída para a raiz do repositório**.

A raiz precisa conter:

```text
functions/
public/
package.json
schema.sql
README_IMPLANTACAO.md
```

Não envie o arquivo ZIP para dentro do repositório.

## 2. Criar o projeto no Cloudflare Pages

1. Acesse **Workers & Pages** no Cloudflare.
2. Crie um projeto Pages conectado ao GitHub.
3. Selecione o repositório da Universal.
4. Use `main` como branch de produção.
5. Deixe o comando de build vazio.
6. Informe `public` como diretório de saída.
7. Mantenha a raiz do repositório como diretório raiz.
8. Faça o primeiro deploy.

## 3. Configurar o banco D1

Crie um banco D1, por exemplo `universal-db`, e adicione ao projeto Pages:

```text
Variable name: DB
Database: universal-db
```

As tabelas são criadas automaticamente. O `schema.sql` serve como referência e recuperação.

## 4. Configurar os arquivos no Supabase Storage

Crie um projeto Supabase separado para a Universal e, em **Storage**, configure:

```text
Bucket: universal-produtos
Tipo: público
Limite por arquivo: 3 MB
Tipos permitidos: image/jpeg, image/png, image/webp

Bucket: universal-anexos
Tipo: privado
Limite por arquivo: 12 MB
Tipos permitidos: image/jpeg, image/png, image/webp, application/pdf
```

Não crie políticas anônimas de gravação. Os uploads passam pela API autenticada do painel.

No projeto Cloudflare Pages, adicione as variáveis de produção:

```text
SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
SUPABASE_PUBLIC_BUCKET=universal-produtos
SUPABASE_PRIVATE_BUCKET=universal-anexos
```

`SUPABASE_SECRET_KEY` deve ser configurada como **Secret** no Cloudflare. Use uma chave secreta de servidor criada em **Supabase → Settings → API Keys → Secret keys**. Nunca use essa chave no navegador, no GitHub, em arquivos `.env` públicos ou em mensagens.

As fotos do catálogo ficam no bucket público. Croquis, PDFs e anexos de pedidos ficam no bucket privado e só são entregues pela API após autenticação no painel.

## 5. Fazer novo deploy

Depois de configurar o binding `DB` e as quatro variáveis do Supabase, faça um novo deploy. Em seguida, acesse:

```text
https://SEU-PROJETO.pages.dev/api/health
```

A resposta deve conter `"ok": true` e `"storage": "supabase"`.

## 6. Criar o primeiro administrador

Abra:

```text
https://SEU-PROJETO.pages.dev/painel/
```

Como o banco começa vazio, o painel exibirá o cadastro do primeiro administrador. Não existe login ou senha predefinidos neste pacote.

Depois do primeiro acesso:

1. cadastre os usuários e permissões;
2. revise os dados da empresa em **Configurações**;
3. cadastre vendedores e produtores;
4. cadastre somente os produtos reais que devem aparecer no site;
5. informe os IDs do GA4 e do Meta Pixel, caso sejam utilizados.

## 7. Domínio próprio

Valide o sistema no endereço `pages.dev` antes de conectar o domínio definitivo. Depois, adicione o domínio em **Custom domains**.

É possível usar:

```text
www.seudominio.com.br       → site público
painel.seudominio.com.br    → painel
```

Quando o endereço começa com `painel.`, a raiz redireciona automaticamente para `/painel/`.

## Segurança e operação

- Cada pessoa deve usar seu próprio login.
- Senhas temporárias exigem troca no primeiro acesso.
- Usuário inativado perde as sessões abertas.
- Senhas são armazenadas com PBKDF2 e salt individual.
- Descontos e troca do responsável pela produção dependem de permissão.
- Alterações críticas ficam registradas na auditoria.
- Conflitos de edição simultânea são bloqueados.
- O painel depende de internet para acessar dados e arquivos operacionais.
- A chave secreta do Supabase fica somente nas variáveis protegidas do Cloudflare.
- O backend limita fotos públicas a 3 MB e anexos privados a 12 MB.
- Nunca coloque senhas, tokens ou arquivos `.env` no GitHub.

## Estrutura

```text
functions/
  _middleware.js
  api/[[path]].js
public/
  index.html
  app.js
  styles.css
  estruturas/
  structures/
  painel/
package.json
schema.sql
```
