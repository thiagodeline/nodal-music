# Robô assistido SINTONE → iMusics (Single)
Execução **local** no Windows; a SINTONE continua operando normalmente sem o robô.

## Instalação (uma vez)
1. Instale Node.js LTS.
2. Baixe este repositório ou a pasta `tools/imusics-worker` para seu computador.
3. Abra CMD dentro de `tools/imusics-worker` e execute:
   ```cmd
   npm install
   npx playwright install chromium
   npm start
   ```
4. Mantenha o CMD aberto.

## Usar
1. Abra **https://sintone-sintone.vercel.app/admin?tab=delivery** no mesmo computador.
2. Acesse com uma conta de administrador ou gestor de ingestão.
3. Em um Single **aprovado**, clique em **Enviar para iMusics (robô local)**.
4. O navegador abre. Se necessário, faça login na iMusics **manualmente**.
5. O robô baixa o WAV e JPG do Supabase com links temporários e tenta preencher artista, título, gênero, áudio, classificação explícita, selo e capa.
6. Preencha os demais campos, revise e envie você mesmo. Não existe clique automático em publicar.
7. Feche a janela do robô antes de iniciar outro lançamento.

## Limitações
- Só funciona com **Single aprovado** que tenha capa e áudio no Storage da SINTONE.
- Requer que os navegadores permitam ao site acessar o serviço local `127.0.0.1:4371`. O Chrome pode solicitar autorização para acesso à rede local.
- Os componentes Angular da iMusics podem mudar. Etapas que falharem ficam para preenchimento manual; não há garantia de automação completa.
- O status de entrega na SINTONE não é alterado automaticamente.
- Não existe API oficial da iMusics envolvida; use apenas se permitido pelos termos do serviço.
- Não inclua senha em arquivos ou no GitHub. **Troque a senha antiga exposta no código compartilhado.**
- O navegador armazena sessão autenticada localmente em `~/.sintone/imusics-browser`. Proteja seu computador.
- O download de cada arquivo possui limite de 350 MB; arquivos temporários são apagados após o fechamento do navegador.
- Caso o link privado expire antes do download, pressione o botão novamente no painel.

## Reverter
A integração não altera dados dos lançamentos. Para desativar, feche o CMD e simplesmente não utilize o botão. O código pode ser revertido com um novo commit Git, sem mexer no banco de dados.
