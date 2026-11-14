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

1. **Nome empresarial encontrado nas consultas públicas:** `64.100.398 THYAGO ESPINDOLA DE MELO`, MEI vinculado ao CNPJ `64.100.398/0001-10`. **Confirmar no CCMEI oficial** antes de habilitar assinaturas. O MEI não tem contrato social, mas tem nome empresarial.
2. **E-mail institucional informado pelo responsável:** `suporte@sintone.com.br`. É necessário garantir que esta caixa esteja configurada e recebendo mensagens; a entrega não foi testada.
3. **Regularidade da atividade:** consultas públicas do CNPJ mostram CNAE principal `5320-2/01` (serviços de malote), sem CNAE secundário de música/distribuição. A SINTONE presta serviços de distribuição musical. **Antes de habilitar contratação remunerada, verificar com contador a adequação dos CNAEs, possibilidade de exercício como MEI e eventual necessidade de desenquadramento.** Confirmar também o endereço no CCMEI.
4. **Revisão jurídica humana** recomendada por profissional habilitado para as particularidades de direitos autorais, direito do consumidor, tributação, LGPD, distribuição e cobrança de royalties.
5. Confirmar se a regra de pagamento e saque é operacionalmente praticável, inclusive para saldos pós-encerramento.

## Procedimento para ativação após confirmação

- Os dois campos antigos de identificação e e-mail foram preenchidos no texto R2. Confirmar o nome empresarial no CCMEI, a funcionalidade do e-mail e a adequação da atividade/CNAE antes de aprovar o modelo.
- Se o texto for alterado de modo substancial, criar a versão `2026.11-R3` em vez de sobrescrever uma versão **já assinada**. Não há assinaturas no banco no momento desta atualização.
- Conferir que o corpo integral exibido ao artista corresponde ao corpo salvo no banco.
- Ativar uma versão por tipo somente após aprovação, preservando as versões anteriores para auditoria.
- Testar com uma conta de staging, incluindo download do PDF e assinatura idempotente, antes de habilitar o público real.
- Corrigir a Política de Privacidade com a identificação e o canal oficial de contato confirmados.

## Testes já feitos

- Compilação do Next.js em GitHub Actions.
- Geração do PDF integral via html2pdf.js: 6 páginas, cerca de 3,2 MB; primeira e última página não vazias.
- Correção do erro de PDF de uma página em branco causado por renderização a `left:-100000px`.
- Verificação de que templates R2 existem no Supabase e permanecem inativos. Os dois campos de identificação e contato foram preenchidos, mas a habilitação jurídica ainda depende de regularidade cadastral e revisão final.

Este documento não é parecer jurídico nem substitui a confirmação de dados da pessoa jurídica.
