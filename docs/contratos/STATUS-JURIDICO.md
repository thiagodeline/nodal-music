# SINTONE — Revisão contratual 2026.11-R2

## Status

- Texto revisto: **sim**.
- Página de leitura /onboarding/contract: **integrada**.
- Integração de assinatura eletrônica, carimbo, PDF e Storage: **integrada**.
- PDF completo de conferência: `docs/contratos/CONTRATO_SINTONE_2026-11_R2_MINUTA.pdf`.
- **Versão aprovada para receber assinaturas reais: NÃO.** A base `contract_templates` permanece com `active=false`.

## Condições definidas a partir do instrumento fornecido e das mudanças solicitadas

- Licença: distribuição digital não exclusiva, sem transferência de titularidade.
- Vigência: prazo indeterminado; cancelamento por qualquer parte, com aviso de 30 dias, sem multa por projeção de faturamento.
- Repasse: 75% ao licenciante, 25% à SINTONE, sobre receitas líquidas definidas no contrato.
- Prazo: até 30 dias do recebimento/solicitação elegível, com reconciliação e limites de saque.
- Mínimo: R$ 50 até 31/12/2026 (mesmo mínimo atual do código), R$ 80 a partir de 01/01/2027 (conforme contrato anterior).
- Fraudes e reclamações: medidas motivadas, possibilidade de contestação, deduções comprovadas.
- Outros serviços (Content ID, edição, sincronização, vídeos): adesão específica, nunca incluídos automaticamente.
- Assinatura: aceite eletrônico simples, sem pretensão de certificado ICP-Brasil.

## Pontos obrigatórios para fechamento jurídico e ativação

1. **Confirmar a razão social oficial vinculada ao CNPJ 64.100.398/0001-10.** O contrato anterior trazia a marca SINTONE e o CNPJ, mas não trouxe a razão social; o número não pôde ser confirmado em registro oficial nesta revisão.
2. **Informar e validar um endereço de e-mail institucional que receba notificações contratuais.** Não inventar um endereço nem divulgar um endereço não monitorado.
3. **Conferir se endereço e CNPJ correspondem à entidade que efetivamente contratará com os artistas** e se os responsáveis pelo selo podem representá-lo.
4. **Revisão jurídica humana** recomendada por profissional habilitado para as particularidades de direitos autorais, direito do consumidor, tributação, LGPD, distribuição e cobrança de royalties.
5. Confirmar se a regra de pagamento e saque é operacionalmente praticável, inclusive para saldos pós-encerramento.

## Procedimento para ativação após confirmação

- Substituir no texto de `contract_templates.body` os dois campos `[PREENCHER: ...]` com informações verdadeiras e conferir o documento final.
- Se o texto for alterado de modo substancial, criar a versão `2026.11-R3` em vez de sobrescrever uma versão **já assinada**.
- Conferir que o corpo integral exibido ao artista corresponde ao corpo salvo no banco.
- Ativar uma versão por tipo somente após aprovação, preservando as versões anteriores para auditoria.
- Testar com uma conta de staging, incluindo download do PDF e assinatura idempotente, antes de habilitar o público real.
- Corrigir a Política de Privacidade com a identificação e o canal oficial de contato confirmados.

## Testes já feitos

- Compilação do Next.js em GitHub Actions.
- Geração do PDF integral via html2pdf.js: 6 páginas, cerca de 3,2 MB; primeira e última página não vazias.
- Correção do erro de PDF de uma página em branco causado por renderização a `left:-100000px`.
- Verificação de que templates R2 existem no Supabase e permanecem inativos.

Este documento não é parecer jurídico nem substitui a confirmação de dados da pessoa jurídica.
