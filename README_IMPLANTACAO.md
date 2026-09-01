# Serralheria e Metalúrgica Universal — atualização 1.4.0

Projeto de produção para GitHub e Cloudflare Pages.

## Atualização de uma instalação existente

Envie estes arquivos para o **mesmo repositório GitHub** que já está conectado ao projeto Cloudflare Pages. Mantenha no Cloudflare o mesmo binding D1 chamado `DB` e as mesmas variáveis do Supabase.

Ao manter o mesmo banco D1:

- os usuários e as senhas atuais continuam cadastrados;
- os produtos e os contadores já registrados são preservados;
- os dados dos módulos operacionais antigos permanecem guardados no banco, mas deixam de ser expostos pelo painel;
- não é necessário executar novamente o primeiro cadastro de administrador.

Não crie outro banco D1 durante esta atualização.

Esta atualização não cria tabelas e não exige migração. Os novos campos são opcionais e ficam no mesmo registro `app_state`. Produtos antigos continuam com o comportamento anterior até serem editados e configurados.

## O que está ativo

- site público em `/`;
- página de estruturas em `/estruturas/`;
- painel do catálogo em `/painel/`;
- cadastro de produtos nas categorias Portão, Porta e Lixeira;
- código automático e não reutilizável (`POR-0001`, `PTA-0001`, `LIX-0001`);
- preço normal, promoção e frete grátis promocional opcional para Cuiabá;
- usuários com os perfis Administrador e Cadastrador;
- contadores de visitas e cliques no WhatsApp;
- valores globais para portão social e fechadura tetra, alterados pelo administrador;
- portão social incluso ou opcional nos portões;
- fechadura normal ou tetra nas portas e nos portões com portão social;
- imagens no Supabase Storage;
- autenticação e dados no Cloudflare D1.

## Regras de frete

- Várzea Grande: frete grátis.
- Cuiabá: R$ 100,00.
- Um produto em promoção só terá frete grátis para Cuiabá quando a opção específica for marcada no cadastro.
- Se a promoção for desativada, o frete grátis promocional para Cuiabá também é desativado.

## Configuração do Cloudflare

- Comando de build: vazio.
- Diretório de saída: `public`.
- Binding D1: `DB` apontando para o banco de produção já existente.

Variáveis do Supabase já utilizadas pela instalação:

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
SUPABASE_PUBLIC_BUCKET
SUPABASE_PRIVATE_BUCKET
```

Não coloque chaves, senhas ou arquivos `.env` no GitHub.

## Primeiro acesso em uma instalação nova

Somente quando o D1 estiver realmente vazio, abra `/painel/` e crie o administrador inicial. Em uma atualização da instalação atual, essa tela não aparece porque os usuários existentes permanecem no banco.

## Estrutura principal

```text
functions/                 API do Cloudflare Pages
public/                    site e painel
package.json               versão do projeto
schema.sql                 referência das tabelas D1
README_IMPLANTACAO.md       este guia
```
