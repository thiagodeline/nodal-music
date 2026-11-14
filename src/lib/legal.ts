// Dados de identificação comercial extraídos do contrato anterior do usuário (não verificados na Receita).
// A razão social e o e-mail contratual exigem confirmação antes de habilitar a assinatura.
export const CO = {
  nome: 'SINTONE',
  razao: 'SINTONE (nome comercial — razão social em conferência)',
  cnpj: '64.100.398/0001-10',
  endereco: 'Rua das Orquídeas, 455, Águas Claras, Viamão/RS, CEP 94575-004',
  email: 'canal LGPD em /lgpd ou suporte no painel do usuário',
  dpo: 'canal de privacidade /lgpd (designação do encarregado a confirmar)',
  percentual: '25% das receitas líquidas elegíveis',
  saqueMin: 'R$ 50 até 31/12/2026; R$ 80 a partir de 01/01/2027',
  prazoSaque: '30 dias corridos, observados o efetivo recebimento e a solicitação de saque',
  foro: 'Viamão/RS, ressalvado o foro legal do consumidor',
  versao: '2026.11-R2',
  data: '14 de novembro de 2026',
}
export type Sec = [string, ...string[]]
