# Publicar em `sitema-hotel.free.nf` (InfinityFree)

Este projeto (**TanStack Start + Nitro**) roda num **backend SSR** (Lovable ou Cloudflare Workers). O InfinityFree só hospeda o **domínio público** (`free.nf`) e **encaminha** cada rota (`/cliente/entrar`, QR, etc.) para esse backend.

## Configuração recomendada (domínio free.nf nos QR e links)

| Arquivo | O que é |
|---------|---------|
| `public-origin.url` | URL que aparece no QR — ex. `http://sitema-hotel.free.nf` |
| `redirect-backend.url` | Onde o app **realmente** roda (Lovable hoje; Cloudflare depois) |

1. No **Lovable** → **Secrets** (ou `.env` local):  
   `VITE_PUBLIC_APP_URL` = conteúdo de `public-origin.url` (sem barra no final).
2. Se mudar de Lovable para Workers, edite só `redirect-backend.url`.
3. Na pasta do projeto:

```powershell
npm run pack:infinityfree
```

4. No **painel InfinityFree** → **File Manager** → `htdocs` do domínio → envie tudo de `deploy/infinityfree/htdocs/` (`.htaccess` + `index.html`).
5. Teste: `http://sitema-hotel.free.nf/cliente/entrar` deve abrir o app (a barra pode mostrar `lovable.app` após o redirect — normal em HTTP 302).

## Opção A — Backend no Lovable (rápido)

Valor padrão em `redirect-backend.url`:

**https://senior-frontend-studio.lovable.app**

Siga os passos da seção acima. Você **usa** o domínio `free.nf` nos links; o visitante é redirecionado ao Lovable até publicar em outro lugar.

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
