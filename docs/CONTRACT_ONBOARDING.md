# SINTONE — Onboarding, contrato eletrônico e PDF

## Fluxo implementado

1. `/onboarding`: usuário autenticado escolhe Artista ou Selo, informa nome, documento, nascimento/fundação, endereço e telefone. O perfil muda de `PENDING_ONBOARDING` para `PENDING_CONTRACT`.
2. `/onboarding/contract`: exibe a **versão do contrato que está armazenada no Supabase**, em uma região com rolagem. O botão só é habilitado após rolar ao final **e** quando a versão estiver juridicamente aprovada (`contract_templates.active = true`).
3. Clique de aceite: Server Action verifica a sessão com `auth.getUser()`, obtém o IP observado pela infraestrutura e chama a função SQL `accept_sintone_contract`. O PostgreSQL define `signed_at` e copia os dados de identidade e uma versão imutável do texto para `user_contracts`.
4. O browser utiliza **html2pdf.js 0.14.0** para gerar o PDF do mesmo texto armazenado, com identificação do contratante e a frase no rodapé de assinatura. O PDF é enviado uma única vez para o bucket **privado** `contracts` no caminho `<user_id>/contrato_assinado.pdf`.
5. A Server Action de finalização baixa o PDF, confere tamanho e cabeçalho PDF, calcula SHA-256 e chama `finalize_sintone_contract_pdf`. O banco verifica que o arquivo existe e conclui `pdf_status = ready`.
6. Sucesso: botões para PDF (URL assinada válida 120 segundos) e dashboard.

### O que é comprovado e o que não é

- Este é um **aceite eletrônico simples**, associado a um login, a identificadores pessoais, à versão contratual, data/hora de servidor e metadados técnicos. **Não é certificado digital ICP-Brasil e não garante, sozinho, identificação forte ou ausência de contestação.**
- `html2pdf.js` gera um PDF visual; não assina criptograficamente o PDF com um certificado.
- O IP encaminhado pela infraestrutura é metadado **de apoio**, não uma prova independente de identidade.
- Conferir rolagem serve à experiência de leitura, não prova que uma pessoa efetivamente leu todo o documento.
- Após a assinatura, a conta permanece `PENDING_CONTRACT` até a revisão administrativa. O painel pode ser acessado, mas `can_release_music` continua `false`; essa liberação ainda exige aprovação.

## ⚠ Bloqueio jurídico intencional na versão atual

**Os Termos de Serviço do repositório ainda contêm campos `[PREENCHER]`** para razão social, CNPJ, sede, percentual de royalties, saque mínimo, prazo e foro.

Por isso a migração cria versões `2026-11` para Artista e Selo com `active=false`. A interface mostra a minuta mas **não permite assiná-la**. Não edite o JavaScript para ignorar essa restrição.

Para liberar o aceite depois de revisar o contrato com orientação jurídica:

1. Complete dados reais da SINTONE (razão social, CNPJ, endereço, contato, comissão, valor mínimo de saque, prazo, foro).
2. Faça a revisão jurídica e negocie as condições comerciais que os artistas vão aceitar.
3. Atualize o conteúdo de `public.contract_templates.body` no Supabase SQL Editor para Artista e Selo. A versão para selo precisa identificar o responsável e o CNPJ corretamente. **Jamais altere o texto de uma versão já assinada; crie outra versão.**
4. Confira o texto integral, revise os anexos e verifique que não restem ocorrências de `[PREENCHER`.
5. Ative uma única versão por tipo de conta:

```sql
-- Execute somente depois da revisão jurídica e aprovação do texto, com dados reais.
update public.contract_templates
set active = true
where version = '2026-11'
  and account_type in ('ARTIST','LABEL')
  and position('[PREENCHER' in body) = 0;
```

A constraint de banco rejeita ativação se ainda houver `[PREENCHER`. Não edite isso para contornar a validação. Antes de ativar, o sistema tem apenas uma **prévia de documento**, não um contrato final.

## Estrutura e segurança

- `public.contract_templates`: versões de texto por tipo de conta, RLS de leitura para `authenticated`, sem permissão de escrita de artista.
- `public.user_contracts`: `signed_name`, `artist_name`, `cpf`/ `cnpj`, `ip_address`, `signed_at`, `pdf_url`, `contract_snapshot`, `contract_version`, `contract_hash`, `pdf_status`, `pdf_sha256`, `pdf_size`, `pdf_uploaded_at`.
- Funções `accept_sintone_contract` e `finalize_sintone_contract_pdf`: permitem apenas conta autenticada; banco deriva nome/documento da própria tabela `profiles` e limita uma assinatura por usuário.
- `contracts` é bucket privado, permitido `application/pdf`, limite de 10 MB.
- Insersão direta de `user_contracts` sem RPC foi removida por RLS; acesso ao PDF é do próprio usuário ou do administrador.
- A recuperação da assinatura preserva a data/hora da primeira aceitação e não cria outro registro em falha de rede/PDF.

## Testes recomendados em preview

- Artista e selo com dados válidos (CPF/CNPJ) em contas de teste, incluindo uma conta que conclua o formulário e outra que seja reaberta em `PENDING_CONTRACT`.
- Sem rolar: botão desabilitado; rolar ao fim: habilitado **apenas para templates ativos**.
- Assinatura bem-sucedida → PDF válido no Storage → registro `user_contracts.pdf_status=ready` → download temporário.
- Falha durante upload → botão de retentativa, sem segunda assinatura.
- Não autenticado → redireciona para login.
- Outro usuário: não vê PDF ou assinatura alheios.
- Administração: somente contratos com PDF pronto têm download e só eles podem ser aprovados.

A integração de **Aceite** requer versão contratual ativa. Não ative minuta incompleta para teste em ambiente de produção. Para testes de assinatura, use uma cópia/staging do Supabase com contrato de testes e contas descartáveis.
