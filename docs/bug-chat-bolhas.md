# Diagnóstico – “bolha da Eco apaga bolha do usuário”

## Resumo do sintoma
Quando o placeholder da Eco reutilizava a mesma identidade lógico-funcional do envio do usuário (`client_message_id`), os patches do stream substituíam a bolha original: o texto digitado desaparecia e a resposta assistente ocupava a posição do usuário. A correção separa identidades por `id` e bloqueia merges cruzados de `role`, preservando as duas bolhas durante toda a conversa.【F:src/contexts/ChatContext.tsx†L571-L693】【F:src/hooks/useEcoStream.ts†L301-L472】

## Passos de reprodução minimais
1. Abrir o chat autenticado (ou o mock de teste) e enviar “olá”.
2. Observar, via logs `[DIAG]`, a criação da mensagem do usuário seguida da criação do placeholder assistente.
3. Confirmar que, durante o streaming, a bolha do usuário permanece intocada e a Eco atualiza apenas a sua própria mensagem.
4. Repetir com dois envios rápidos para validar o cancelamento do stream anterior e a preservação das bolhas.

## Mapa de fluxo de estado
- `beginStream` registra o texto do usuário, aborta fluxos anteriores e aciona o SSE com o novo `clientMessageId`, mantendo um mapa local de textos para detectar ecos.【F:src/hooks/useEcoStream.ts†L725-L805】
- `ensureAssistantMessage` cria (ou reaproveita) a bolha assistente com `id` exclusivo, metadata com `reply_to_client_message_id` e status `streaming`, sem substituir a mensagem do usuário.【F:src/hooks/useEcoStream.ts†L301-L472】
- `applyChunkToMessages` direciona todos os patches para o `assistantId`, filtra o primeiro chunk que repete o texto do usuário e atualiza conteúdo/metadata da Eco por meio de `upsertMessage` ou `setMessages` controlado.【F:src/hooks/useEcoStream.ts†L476-L720】
- `ChatContext.upsertMessage` resolve o alvo sempre por `id` canônico (ou por mapas separados de `client_message_id` + `role`) e impede merges entre roles diferentes, evitando que a Eco sobrescreva entradas do usuário.【F:src/contexts/ChatContext.tsx†L190-L241】【F:src/contexts/ChatContext.tsx†L571-L693】

## Causa-raiz confirmada
O pipeline original localizava mensagens assistentes pelo `client_message_id` sem discriminar o `role`, de modo que um patch assistente recaía sobre a mensagem do usuário. A nova resolução prioriza `id`, consulta `client_message_id` apenas dentro do mesmo `role` e duplica a mensagem quando há divergência, eliminando a colisão.【F:src/contexts/ChatContext.tsx†L571-L684】

## Correção implementada
- **Decisão de design:** `client_message_id` deixou de ser chave canônica de upsert; a busca prioriza `id` e só utiliza `client_message_id` quando `role` combina.【F:src/contexts/ChatContext.tsx†L571-L647】
- **Mapa de índices:** `byIdRef` armazena apenas `id`, e `clientIndexRef` mantém mapas paralelos por `role` (`assistant`/`user`) para resoluções por `client_message_id`.【F:src/contexts/ChatContext.tsx†L190-L233】
- **Regra de segurança:** antes do merge, o `ChatContext` verifica o `role`; se o patch assistente apontar para uma mensagem `user`, a atualização vira uma nova entrada, nunca um overwrite.【F:src/contexts/ChatContext.tsx†L665-L684】
- **Placeholder isolado:** `ensureAssistantMessage` gera `id` exclusivo, liga metadata `reply_to_client_message_id` e nunca reaproveita o objeto do usuário, garantindo identidades distintas no estado.【F:src/hooks/useEcoStream.ts†L428-L450】
- **Stream robusto:** `applyChunkToMessages` injeta `assistantId` em todos os patches, mescla metadata preservando o vínculo fraco com o usuário e ignora o primeiro chunk que ecoa o texto original.【F:src/hooks/useEcoStream.ts†L528-L705】
- **Chaves React estáveis:** `MessageList` agora renderiza estritamente com `key={message.id}`, reportando em log qualquer mensagem sem `id` para investigação.【F:src/components/MessageList.tsx†L95-L147】

## Checklist do que estava errado (e como foi endereçado)
- ✓ `byIdRef` não diferencia mais roles ao indexar `client_message_id`; agora usa apenas `id` + mapas por role.【F:src/contexts/ChatContext.tsx†L190-L233】
- ✓ `upsertMessage` não substitui mensagens de `role:'user'` por patches assistentes; a divergência de role dispara uma nova inserção.【F:src/contexts/ChatContext.tsx†L665-L684】
- ✓ O placeholder da Eco possui `id` próprio e metadata vinculada, evitando a colisão com a bolha do usuário.【F:src/hooks/useEcoStream.ts†L428-L450】
- ✓ O primeiro chunk que replica o texto digitado é descartado, evitando “ecos” visuais.【F:src/hooks/useEcoStream.ts†L533-L548】
- ✓ As renderizações utilizam `key={message.id}`, prevenindo reciclagem de nós pelo índice.【F:src/components/MessageList.tsx†L113-L146】

## Validação manual
- **Caso A – básico:** enviar “olá” produz duas bolhas estáveis; a resposta da Eco conclui com `status: done` e o texto do usuário permanece inalterado.
- **Caso B – envio duplo rápido:** o novo envio aborta o stream anterior (`done/abort`) e apenas o último placeholder segue ativo.
- **Caso C – ID/role cruzado:** um patch assistente com `client_message_id` do usuário gera nova mensagem, conforme o guard de role.
- **Caso D – render keys:** inspeção mostra `key={message.id}` em todos os itens e logs `[DIAG] render:missing-id` permanecem silenciosos.

## Instrumentação ativa
Os logs `[DIAG]` continuam disponíveis (`send`, `eco:placeholder`, `chunk`, `done/abort`, `chunk:echo-skip`, `chat:role-split`), todos protegidos por condicionais de ambiente, permitindo rastrear qualquer regressão sem impactar produção.【F:src/hooks/useEcoStream.ts†L470-L720】【F:src/contexts/ChatContext.tsx†L540-L684】
