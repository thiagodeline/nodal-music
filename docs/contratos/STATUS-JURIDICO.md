# SINTONE — contrato de distribuição digital 2026.11-R2

## Estado operacional em 14/11/2026

**Ativo para aceites eletrônicos:** SIM, após aprovação expressa do titular da SINTONE.

- Supabase `contract_templates`: `active=true` para **ARTIST** e **LABEL**, versão `2026.11-R2`.
- Fonte do documento: `docs/contratos/sintone-contrato-2026-11-r2.txt` (15.135 caracteres).
- Nome comercial exibido: **SINTONE**, MEI de CNPJ **64.100.398/0001-10**. O nome empresarial completo não é impresso.
- Contato contratual exibido: **suporte@sintone.com.br**.
- Contrato de adesão com distribuição **não exclusiva**, 75% do líquido ao artista e 25% à SINTONE, saques conforme as condições contratuais, prazo indeterminado e rescisão com aviso de 30 dias.
- Forma de assinatura: **aceite eletrônico simples**, com snapshot de documento, identidade informada, hash SHA-256 do texto, horário de servidor e IP observado. Não é assinatura qualificada ICP-Brasil.
- Geração de PDF via `html2pdf.js`, upload para bucket privado `contracts/<user_id>/contrato_assinado.pdf`, verificação e hash SHA-256 de arquivo no servidor e URL temporária para download.
- Política de Storage de contratos exige registro de aceite `pdf_status='pending'` para permitir upload.

O PDF de consulta salvo em `docs/contratos/CONTRATO_SINTONE_2026-11_R2_MINUTA.pdf` mantém a marca de minuta porque foi produzido antes da aprovação. A versão **vinculante** é exclusivamente o texto integral de `contract_templates.body` capturado em `user_contracts.contract_snapshot` no momento do aceite. O PDF entregue ao artista é gerado a partir desse texto imutável e não contém a marca gráfica de minuta.

## Aprovação e limitações

O titular **aprovou a ativação operacional** do texto apresentado. Isso **não representa homologação jurídica por profissional habilitado**. Continuam recomendadas verificações de:

1. Compatibilidade da atividade econômica/CNAE do MEI com a distribuição musical e eventual necessidade de reenquadramento.
2. Identificação da parte contratante no contrato (marca + CNPJ), endereço e documentação empresarial oficial.
3. Funcionamento da caixa postal `suporte@sintone.com.br`.
4. Revisão do contrato por advogado com experiência em direitos autorais, distribuição, LGPD e direito contratual.
5. Funcionalidade dos repasses/royalties nas condições acordadas, inclusive em caso de cancelamento.

## Testes e limites da validação

- Código da assinatura publicado em Next.js/Vercel anteriormente à ativação.
- Template R2 comparado **integralmente** com o texto versionado no GitHub, para ambos os perfis.
- Bucket `contracts` privado, limite 10 MB para PDFs.
- Concessão `EXECUTE` do RPC de assinatura apenas a `authenticated`, com verificação do usuário, status do onboarding e versão ativa.
- Build de produção e geração de PDF integral já validados em GitHub Actions.
- **Ainda não foi comprovado o fluxo completo em uma conta real de teste** (aceite, upload e download em produção). Recomenda-se fazê-lo antes de incentivar inscrições em massa, sem presumir que um teste de build garanta todo o fluxo.
- Nenhum registro contratual preexistente foi alterado por essa ativação.

## Alterações futuras

Uma versão assinada **não deve ser editada**. Para alterações materiais, publicar e ativar uma nova versão R3, com o consentimento aplicável, preservando a R2 nas tabelas de auditoria. O `contract_hash` e `contract_snapshot` de cada assinatura são permanentes.
