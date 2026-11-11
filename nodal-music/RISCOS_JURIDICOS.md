# Riscos jurídicos da Nodal Music (leitura para você e para o seu advogado)

Este documento não é parecer jurídico. Peça a um advogado de direito digital e de direito autoral para revisar os textos antes de publicar.

## Críticos (resolva antes de lançar)
1. Campos [PREENCHER]: razão social, CNPJ, endereço, e-mail de privacidade, encarregado, comissão, saque mínimo, prazo e foro. Páginas legais com lacunas são juridicamente fracas.
2. Direitos autorais de terceiros: distribuir sample, cover, remix ou voz clonada sem licença expõe a Nodal a notificações, bloqueio pelas lojas (que podem punir a distribuidora inteira) e ação de indenização. Marco Civil (art. 19) exige retirada após ordem judicial, e as lojas exigem retirada após notificação. Tenha um processo de denúncia e um e-mail de contato.
3. Streams artificiais: lojas rescindem com distribuidoras que repassam fraude. Mantenha cláusula de estorno e monitore picos anormais.
4. Menores de idade: ECA Digital (Lei 15.211/2025, em vigor desde 17/03/2026, fiscalizada pela ANPD) e a LGPD (art. 14) exigem cuidado extra. Autodeclaração de idade é frágil. Os termos pedem 18+ ou responsável, mas não há verificação. Se houver artistas adolescentes, trate a conta pelo responsável e documente a autorização.
5. Dinheiro de terceiros: você guarda royalties de artistas. Tenha contabilidade separada, regra clara sobre saldo e estorno e contrato claro. Reter valor sem regra escrita gera ação por apropriação e dano.
6. Tributos: pagamento a pessoa física pode exigir retenção de IR e INSS e emissão de RPA. Pagamento a PJ exige nota fiscal. Confirme o tratamento com um contador antes do primeiro saque.

## Altos
7. Cláusulas abusivas (CDC, art. 51): limitação de responsabilidade, retenção de valores, alteração unilateral e foro. Se o artista for consumidor, estas cláusulas podem ser anuladas. O texto já ressalva o foro do consumidor e dá 30 dias de aviso.
8. Arrependimento de 7 dias (CDC, art. 49): vale para contratação online de serviço pago. Se houver cobrança, a devolução integral dentro do prazo é a regra, mesmo que o serviço já tenha começado. Há discussão sobre devolução proporcional, então decida com seu advogado.
9. IA: música gerada por IA, clonagem de voz e direito de imagem e voz (Código Civil art. 20, LGPD). Os termos exigem declaração, mas defina a política de aceitação.
10. Transferência internacional: Supabase e Vercel podem tratar dados fora do Brasil (LGPD art. 33 e Res. CD/ANPD 19/2024). Mantenha o Supabase na região São Paulo e registre as cláusulas contratuais padrão dos fornecedores.
11. Pedidos LGPD: prazo de 15 dias. Há uma fila no painel admin. Defina quem responde.
12. Incidentes de segurança: comunicação à ANPD e aos titulares em até 3 dias úteis (Res. CD/ANPD 15/2024). Tenha um plano de resposta e uma pessoa responsável.
13. Encarregado (DPO): a Res. CD/ANPD 18/2024 exige divulgar identidade e contato. Agentes de pequeno porte podem ser dispensados de nomear, mas precisam de um canal.

## Médios
14. Logs de acesso: guarde 6 meses (Marco Civil, art. 15). Isso já consta na política.
15. ECAD e direitos conexos: distribuição digital não substitui arrecadação de direitos de execução pública. Diga isso ao artista para evitar expectativa errada.
16. Provas de aceite: o cadastro agora grava versão e data do aceite dos termos (colunas terms_version e terms_accepted_at). Guarde as versões antigas dos textos.
17. Marca: confirme no INPI se “Nodal Music” está disponível na classe de serviços adequada, e o domínio no Registro.br.
18. Dados que você guarda a mais: a chave Pix fica no perfil por conveniência. Se quiser coletar o mínimo absoluto, remova a coluna pix_key de profiles e peça a chave a cada saque.
