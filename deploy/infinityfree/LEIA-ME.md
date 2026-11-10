# Publicar em `sitema-hotel.free.nf` (InfinityFree)

Este projeto (**TanStack Start + Nitro**) gera um app para **Cloudflare Workers**, não um site só HTML no Apache do InfinityFree. Por isso o endereço [http://sitema-hotel.free.nf/](http://sitema-hotel.free.nf/) **não mostra o sistema automaticamente** — é preciso publicar arquivos ou redirecionar.

## Opção A — Redirecionar para o app no Lovable (rápido, app completo)

O app completo já funciona em:

**https://senior-frontend-studio.lovable.app**

1. Entre no **painel InfinityFree** (Vista / cPanel) da conta onde está `sitema-hotel.free.nf`.
2. Abra **Domains** → seu subdomínio → pasta **`htdocs`** (ou **File Manager**).
3. Envie o conteúdo da pasta `deploy/infinityfree/htdocs/` deste repositório (substitua o que existir).
4. Ou use **Redirects** no painel: origem `/` → destino `https://senior-frontend-studio.lovable.app` (301 ou 302).

Ao abrir `http://sitema-hotel.free.nf/`, o visitante cai no app publicado no Lovable.  
**Observação:** depois do redirecionamento, a barra de endereço pode mostrar o domínio `lovable.app` (comportamento normal do redirect).

## Opção B — App na nuvem (Cloudflare) + link no free.nf

1. No PC, na pasta do projeto: `npm run build`
2. Na pasta `.output`: `npx wrangler deploy` (conta Cloudflare gratuita).
3. Anote a URL que o Wrangler mostrar (ex.: `https://senior-frontend-studio.xxx.workers.dev`).
4. No InfinityFree, redirecione `sitema-hotel.free.nf` para essa URL (como na opção A).

Assim o **sistema inteiro** roda no Cloudflare; o `free.nf` vira “atalho”.

## Opção C — Domínio próprio no Lovable (melhor para produção)

Com um domínio **.com.br** (Registro.br etc.):

1. No [Lovable](https://lovable.dev), em **Settings → Domains**, conecte o domínio.
2. No DNS, crie o **CNAME** que o Lovable indicar.

O subdomínio **`.free.nf`** do InfinityFree **não** pode ser transferido para o Lovable como domínio customizado da mesma forma que um domínio que você comprou.

## QR e links para hóspedes

Quando o app estiver acessível numa URL fixa pública, defina no build:

```env
VITE_PUBLIC_APP_URL=https://sitema-hotel.free.nf
```

(ou a URL final do Lovable/Workers). Isso ajuda os QR em `/acesso` e `/recepcao`.

## Limitação importante

Hospedar **só** no InfinityFree (upload ZIP/HTML, sem redirect) **não** executa este projeto completo, porque falta o servidor Node/Worker do TanStack Start. Para o MVP, use **redirect** ou **Lovable/Cloudflare**.
