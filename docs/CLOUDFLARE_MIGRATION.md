# Migração da SINTONE: Vercel → Cloudflare Workers

> **Situação**: preparação de código. **Não alterar DNS antes de testar**.
> A migração de infraestrutura não altera as tabelas, autenticação ou arquivos do Supabase.

## 1. Plataforma e arquitetura

- Site SINTONE: Next.js 15.5.29 + React 19, adaptado ao runtime Workers com OpenNext 1.20.17.
- Cloudflare Worker (nome de preparação): `sintone-preview`.
- Supabase existente: Auth, PostgreSQL, Storage (incluindo buckets privados).
- Domínio atual `nodalmusic.com.br`: continua apontando para a Vercel até o teste de ponta a ponta.
- Nenhum segredo de Supabase ou Cloudflare deve ser colocado no GitHub ou no arquivo `wrangler.jsonc`.

## 2. Conferir o build antes de configurar DNS

No diretório raiz (não usar o diretório legado `nodal-music/`):

```bash
npm install
npm run cf:build
```

O resultado esperado inclui os arquivos `.open-next/worker.js` e `.open-next/assets`.

Faça estes testes antes de prosseguir:
1. Home, login e cadastro responsivo.
2. Cadastro como Artista e Selo; confirmação de e-mail quando habilitada.
3. Login e redirecionamento para onboarding.
4. Acesso ao dashboard com sessão válida.
5. Acesso `/admin` exclusivamente com conta admin.
6. Envio e pré-escuta de áudio, upload de capa e download de contrato em bucket privado.
7. Aprovar/rejeitar lançamento de teste e exibir o motivo no painel do artista.

**Atenção:** o plano Workers Free tem limites de CPU e tamanho do script comprimido. Um build de Next.js completo pode precisar do Workers Paid mesmo que o tráfego seja baixo. Verifique o relatório de tamanho e o consumo de CPU.

## 3. Criar o Worker na Cloudflare

No painel [Cloudflare Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages):

1. Clique em **Create application** e conecte o GitHub.
2. Selecione o repositório `thiagodeline/nodal-music`.
3. Selecione esta branch de migração primeiro; não use `main` enquanto a prévia não for validada.
4. Defina o **Root directory** como `/` (raiz do repositório, não `nodal-music/`).
5. O nome do Worker deve ser exatamente **`sintone-preview`**, igual ao `name` do `wrangler.jsonc`.
6. **Build command**: `npm run cf:build`.
7. **Deploy command**: `npm run cf:deploy`.
8. Para previews, use `npx wrangler preview` ou a configuração de preview disponível.
9. O endereço para teste deve ficar no subdomínio `*.workers.dev` atribuído à conta.

## 4. Variáveis de ambiente

Configure **ambos** no painel Cloudflare:

- **Workers Builds → Build variables and secrets** (necessárias para embutir as variáveis `NEXT_PUBLIC_*` no Next.js).
- **Worker → Settings → Variables and Secrets** (necessárias em execução).

Variáveis requeridas:

```text
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<chave publica / publishable key do mesmo projeto>
```

Use **o mesmo projeto Supabase já ligado à SINTONE na Vercel**. Não crie um segundo banco nem use uma service role key. Nunca inclua a chave em um commit ou mensagem de chat. Se a Cloudflare permitir, use Secrets mesmo para valores de configuração sensíveis.

Se a Vercel utiliza apenas essas duas variáveis, não há outros segredos do projeto a migrar; confirme no painel original antes do corte.

## 5. Autenticação no novo domínio

Em Supabase → Authentication → URL Configuration:

- Adicione temporariamente o endereço Workers `https://<worker>.<conta>.workers.dev/**` aos **Redirect URLs**, caso seu fluxo utilize links de confirmação, recuperação de senha ou redirects.
- Mantenha o `Site URL` oficial `https://nodalmusic.com.br` até o corte.
- Não remova os URLs que já funcionam na Vercel.

Sessões do navegador não são compartilhadas automaticamente entre o domínio da Vercel e `workers.dev`; faça um login novo no preview. O banco de usuários, por outro lado, permanece no mesmo Supabase.

## 6. Mudar o domínio somente depois dos testes

1. Adicione `nodalmusic.com.br` como **zone** na conta Cloudflare.
2. Confira se os registros DNS existentes foram importados corretamente, especialmente **MX, SPF, DKIM, DMARC**, caso o domínio use e-mails.
3. No registrador do domínio, configure os nameservers fornecidos pela Cloudflare e aguarde ativação da zone.
4. Em **Workers & Pages → sintone-preview → Settings → Domains & Routes → Add → Custom Domain**, conecte `nodalmusic.com.br`, após a prévia estar estável.
5. Caso use `www`, configure a versão `www.nodalmusic.com.br` e redirecionamento coerente.
6. Remova/ajuste registros A/CNAME conflitantes somente no momento do corte.
7. Verifique o HTTPS, cadastro, painel e login no endereço definitivo.

**Não é necessário transferir a propriedade ou renovação do domínio para a Cloudflare.**
A mudança dos nameservers aponta o DNS para a Cloudflare, não transfere o registro.

## 7. Plano de reversão

- Mantenha o projeto Vercel intacto durante a validação e por um período depois do corte.
- Se a plataforma no Worker apresentar problemas, remova a associação do domínio ao Worker e restaure os registros DNS para o endpoint da Vercel, ou reverta os nameservers se necessário.
- Não altere nem apague dados Supabase como parte do rollback.

## 8. Custos e limites

Não há mensalidade para somente adicionar um domínio à zone Free, mas o domínio continua com renovação paga no registrador. **Hospedar a aplicação no Workers Free não é garantido**: o limite de **3 MiB comprimido do Worker** e **10 ms de CPU por requisição** pode exigir Workers Paid.

Documentação oficial:
- https://opennext.js.org/cloudflare/get-started
- https://opennext.js.org/cloudflare/howtos/env-vars
- https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
- https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- https://developers.cloudflare.com/workers/platform/limits/
