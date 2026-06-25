# `_legacy/` — fluxo cartão + trial do sono (arquivado)

Código **fora do build e fora dos testes ativos** (o Vitest exclui `**/_legacy/**`;
o Vite só empacota o que é importado, e nada vivo importa esta pasta). Guardado
aqui — em vez de deletado — para religar o modelo de cobrança **cartão + trial de
7 dias** sem reconstruir.

O funil ativo do sono usa **Pix único / acesso vitalício** (`../SonoInlinePix.tsx`),
que substituiu este fluxo porque o cartão (3DS/recorrência/webview IG-FB) era o
gargalo de conversão.

## Arquivos
- `SonoInlineCard.tsx` — passo de cartão inline (envolve o brick do Mercado Pago
  via `@/components/assinar/MpCardForm`); chama `POST /api/subscription/create-with-card`,
  plano `monthly`, dispara `InitiateCheckout` + correlaciona `StartTrial`/`Purchase`.
- `CancelInfoModal.tsx` — modal "cancele quando quiser" usado pelo card.
- `SonoInlineCard.cancelInfo.test.tsx` — teste do modal (dormente).

## Dependências ainda vivas (não mexer)
- `@/components/assinar/MpCardForm` — usado também pelo `/assinar`.
- `ensureStartTrialEventId` / `getStartTrialEventId` em `@/lib/fbpixel` — mantidos
  vivos só por este fluxo (marcados como LEGADO lá).

## Como religar
1. Mover os arquivos de volta:
   - `SonoInlineCard.tsx` → `src/components/sono/`
   - `CancelInfoModal.tsx` → `src/components/sono/`
   - teste → `src/components/sono/__tests__/`
2. Reverter os imports relativos: `./CancelInfoModal` → `@/components/sono/CancelInfoModal`
   e, no teste, `./SonoInlineCard` → `../SonoInlineCard`.
3. Reconectar no `SonoInlineCheckout.tsx`: importar `SonoInlineCard` e renderizá-lo
   no passo de pagamento (hoje esse passo renderiza `SonoInlinePix`). Avaliar o
   passo `confirming` (polling do webbook) que o card pressupõe.
4. (Opcional) Remover `**/_legacy/**` do `exclude` em `vitest.config.ts`.

Histórico completo: `git log --follow -- src/components/sono/_legacy/SonoInlineCard.tsx`.
