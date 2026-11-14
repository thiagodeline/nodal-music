# SINTONE — Distribuição Musical

Site da distribuidora musical SINTONE, com Next.js 15, Supabase e identidade visual própria.

## Hospedagem

- **Cloudflare Workers (migração em preparação):** veja [guia de implantação e migração](docs/CLOUDFLARE_MIGRATION.md).
- **Vercel:** infraestrutura atual mantida como contingência até a migração ser validada.

## Desenvolvimento

```bash
npm install
npm run dev
```

Configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` usando o projeto existente do Supabase; nunca comite credenciais.

## Compilar para Cloudflare

```bash
npm run cf:build
```

Para usar o domínio `nodalmusic.com.br`, primeiro valide cadastro, login, admin, uploads e downloads no endereço `workers.dev`.
