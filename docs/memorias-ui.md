# Memórias — Guia de Normalização e Fallbacks

Este documento descreve como o front-end trata os dados de memórias antes de renderizar os cartões.

## DTO de cartão (`MemoryCardDTO`)

Todos os cartões consomem instâncias de `MemoryCardDTO`, criado a partir do payload bruto da API (`Memoria`). A transformação acontece em `src/pages/memory/memoryCardDto.ts` e garante:

- **Título (`titulo`)**: usa `emocao_principal` normalizada; se vazio, cai para `categoria`; depois para a primeira tag; por fim exibe “Memória”. Nunca renderizamos “Indefinida” quando existe qualquer candidato.
- **Subtítulo (`subtitulo`)**: domínio da vida (`dominio_vida`/aliases). Quando ausente, mostramos “Pessoal”.
- **Intensidade (`intensidade`/`intensidadeLabel`)**: coerção numérica segura para 0–10, com `—/10` e indicador textual “Sem dado” quando o backend não envia o campo.
- **Tags (`tags`)**: sempre um array de strings limpas. Strings recebidas são splitadas por vírgula/ponto-e-vírgula, `trim` e `Set` para remover duplicatas. Com 0 tags nenhum chip é exibido.
- **Tempo relativo (`timeAgo`)**: formato humano com minutos, horas, dias ou semanas. Se o cálculo falhar, usamos a data curta `fallbackDate` (`dd MMM`).
- **Resumo (`resumo`)**: prioriza `analise_resumo`, com fallback para `resumo_eco`. O texto passa por limpeza de espaços e truncamento suave (até ~190 caracteres) preservando frase; adicionamos nota em UI quando foi reduzido.
- **Nível de abertura (`nivelAbertura`)**: copia `nivel_abertura` quando existir.
- **Tema emocional**: todo cartão recebe `emotionTheme` com classes Tailwind pré-definidas (alegria, tristeza, raiva, medo, surpresa, nojo, calma, neutra). Emoções não mapeadas caem em “neutra”. Além disso usamos o `accent` do token para gradientes e sombras.
- **Ordenação**: `normalizeMemoryCollection` devolve os cartões já ordenados por `created_at` desc.

## Fallbacks de interface

- **Tags extras**: exibimos até 3 chips; quando houver mais, mostramos um chip neutro “+N”.
- **Intensidade ausente**: barra zerada com rótulo “Sem dado” e marcador “—/10”.
- **Tempo relativo inválido**: exibimos diretamente `fallbackDate` (ex.: `05 jun`).
- **Contexto longo**: colapsado a 260 caracteres com botão “Ver mais”.
- **Ações**: “Abrir no chat” sempre disponível; “Marcar como favorita” controla estado local; “Editar tags” aparece apenas se um handler for informado.

## Estados vazios / loading / erro

- **Loading**: `MemoryCardSkeleton` replica avatar, título e barra de intensidade com animação `animate-pulse`.
- **Vazio**: ilustração leve e CTA “Grave sua primeira memória”; quando filtros estão ativos, instruímos a relaxar os filtros.
- **Erro**: mensagem amigável (com detalhes técnicos quando disponíveis) + botão “Tentar novamente” que recarrega a página.

Consulte `src/pages/memory/MemoriesSection.tsx` para ver a aplicação desses estados.
