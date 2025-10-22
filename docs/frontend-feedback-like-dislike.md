# Fluxo de feedback (like / dislike) no front-end

## Visão geral
O bloco de feedback é mostrado na `ChatPage` sempre que as mensagens do assistente (sender `eco`) atendem a três critérios:

1. A sessão atual ainda não registrou um feedback (checagem via `sessionStorage` com a chave `eco_feedback_given`).
2. Existem pelo menos três mensagens enviadas pela Eco (`aiMessages.length >= 3`).
3. A última resposta da Eco contém uma `deepQuestion` marcada como verdadeira.

Quando essas condições são verdadeiras, o estado `showFeedback` torna-se `true` no hook `useFeedbackPrompt`, e a `ChatPage` renderiza o componente [`FeedbackPrompt`](../src/components/FeedbackPrompt.tsx) logo abaixo da última mensagem da Eco. O hook também calcula e expõe `lastEcoInfo` (índice e conteúdo da última mensagem da Eco) para que o prompt envie o identificador correto da mensagem ao backend.

## Hook `useFeedbackPrompt`
O hook centraliza os efeitos colaterais relacionados ao feedback:

- Filtra as mensagens atuais para obter somente as respostas da Eco (`aiMessages`).
- Localiza a última mensagem da Eco (`lastEcoInfo`).
- Monitora mudanças em `aiMessages` para decidir quando mostrar o feedback. Caso a sessão já tenha dado feedback, o prompt permanece oculto.
- Após o envio do feedback, executa `handleFeedbackSubmitted`, que:
  - Persiste a flag `eco_feedback_given` no `sessionStorage` para evitar prompts repetidos na mesma sessão do navegador.
  - Chama `clearLastEcoDeepQuestion` para limpar o campo `deepQuestion` da última resposta da Eco, impedindo que o feedback seja reexibido para a mesma mensagem.
  - Reseta `showFeedback` para `false`.

## Componente `FeedbackPrompt`
O componente apresenta o fluxo de interação com o usuário:

1. **Modo inicial (`ask`)** – Mostra a pergunta "Essa resposta ajudou?" com dois botões:
   - 👍 (like): dispara `send(1)` imediatamente.
   - 👎 (dislike): muda o estado para `reasons` e rastreia o evento `Front-end: Feedback Motivos Abertos` no Mixpanel.
2. **Modo `reasons`** – Lista botões pré-definidos com motivos de insatisfação (por exemplo, "Muito genérico", "Confuso" etc.) e a opção "Outro". Selecionar um motivo chama `send(-1, motivo)`. Há ainda um botão "Voltar" para retornar ao modo inicial.
3. **Modo `done`** – Exibe a mensagem "Obrigado pelo feedback 💛" após o envio bem-sucedido.

Durante todo o fluxo o componente gerencia um estado `loading` para bloquear interações simultâneas.

### Envio do feedback (`send`)

O método `send` realiza as etapas abaixo:

1. Define `loading=true`.
2. Constrói a URL base a partir de `RAW_API_BASE` (vazio por padrão, com fallback para `DEFAULT_API_BASE`) e envia um `POST` para `/api/feedback` com os dados:
   - `sessaoId`, `usuarioId` e, se existir, `mensagemId` (somente IDs persistidos).
   - `rating` (`1` para like, `-1` para dislike).
   - `reason` (apenas quando o usuário escolhe um motivo no modo `reasons`).
   - `source` indicando se o feedback veio direto do prompt (`thumb_prompt`) ou da lista de motivos (`options`).
   - `meta` com informações complementares, incluindo a tela (`ChatPage`) e metadados extras recebidos via `extraMeta`.
3. Em caso de sucesso:
   - Rastreia o evento `Front-end: Feedback Enviado` no Mixpanel.
   - Altera o modo para `done`.
   - Invoca o callback `onSubmitted` (fornecido pela `ChatPage`), que registra o encerramento (`Front-end: Feedback Encerrado`) e aciona `handleFeedbackSubmitted` do hook.
4. Em caso de erro:
   - Rastreia `Front-end: Feedback Falhou` no Mixpanel com a mensagem de erro.
5. Finaliza definindo `loading=false`.

## Barra de ações em `EcoMessageWithAudio`

Além do prompt exibido ao final da conversa, cada resposta da Eco que utiliza o componente [`EcoMessageWithAudio`](../src/components/EcoMessageWithAudio.tsx) mostra uma barra de ações compacta alinhada à bolha. Ela antecipa futuras integrações com like/dislike e oferece utilitários imediatos:

- **Copiar (`ClipboardCopy`)** – disponível para todas as mensagens. Copia o texto renderizado pela Eco e mostra o rótulo "Copiado!" por 1,4s graças ao estado local `copied`.
- **Curtir (`ThumbsUp`) e Não curtir (`ThumbsDown`)** – os botões já estão renderizados com o mesmo visual do prompt (`GhostBtn` com ícone `lucide-react`) para facilitar a reutilização futura. Atualmente os `onClick` são placeholders (`() => {}`); a ideia é conectá-los ao mesmo fluxo descrito acima assim que a API estiver pronta para receber feedbacks diretamente da mensagem.
- **Ouvir (`Volume2`)** – aparece apenas para respostas da Eco com texto. Ao clicar, dispara `gerarAudioDaMensagem` para sintetizar o TTS, mostra um `Loader2` enquanto espera e abre o `AudioPlayerOverlay` com a reprodução.

Características adicionais:

- O wrapper `GhostBtn` centraliza o estilo (tamanho, foco, hover) para manter consistência visual e acessibilidade.
- A barra herda margens e limites de largura da bolha (`max-w-[min(720px,88vw)]`) para não extrapolar a coluna central do chat.
- O estado `audioUrl` garante que apenas uma narração fique aberta por vez; ao acionar novamente, o overlay anterior é fechado antes de iniciar outro request.

## Eventos Mixpanel rastreados

- `Feedback Shown` – disparado pelo hook quando o prompt é exibido.
- `Front-end: Feedback Interação` – like acionado antes do envio.
- `Front-end: Feedback Motivos Abertos` – clique no botão de dislike abrindo a lista de motivos.
- `Front-end: Feedback Enviado` – sucesso no envio.
- `Front-end: Feedback Encerrado` – callback após finalizar o prompt.
- `Front-end: Feedback Falhou` – falha na requisição.

## Persistência da decisão do usuário

A flag `eco_feedback_given` é removida do `sessionStorage` quando o usuário sai da conta (`AuthContext`), garantindo que um novo login possa receber o prompt novamente. Enquanto a flag existir, o feedback não reaparecerá, mesmo que a página seja recarregada.
