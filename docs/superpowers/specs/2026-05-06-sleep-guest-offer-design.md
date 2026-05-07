# Sleep Guest Offer — Design Spec
**Date:** 2026-05-06  
**Status:** Approved

## Problem

Two broken/missing conversion points in the Sleep Protocol guest funnel:

1. **Landing page** (`/sono/experiencia`) — no offer section visible to guests; scroll broken on mobile/desktop.
2. **End of free meditation** — `SonoPostExperienceModal` is wired up but not appearing after Night 1 completes; copy is outdated.

## Scope

Three files change:

| File | Change |
|---|---|
| `src/components/sono/SonoPostExperienceModal.tsx` | Update `MAIN_OFFER_COPY` + night breakdown list |
| `src/components/sleep/SleepMeditationExperience.tsx` | Fix modal trigger; add `SleepProtocolOfferCard` section; fix scroll |
| `src/components/sono/SleepProtocolOfferCard.tsx` *(new)* | Inline offer card for landing page |

No changes to: `GuestSonoPlayer.tsx`, `useSonoCheckout.ts`, routing, checkout API.

---

## Section 1 — Bug Fix: Modal Not Appearing After Meditation

### Root Cause (3 candidates, fix addresses all)

1. **Lazy import failing silently** — `SonoPostExperienceModal` is imported with `lazy()` inside a `Suspense fallback={null}`. If the chunk fails to load, nothing renders and no error surfaces.
2. **Early-return swallows the modal** — When `guestPlayback !== null`, the component early-returns only `<GuestSonoPlayer>`. The modal lives outside this branch. Even though React 18 batches `setGuestPlayback(null)` + `setShowOfferModal(true)` together, any timing edge case during the unmount cycle can cause the modal to open and immediately disappear.
3. **`completedRef` stale from prior session** — `completedRef.current = true` persists within the same React tree lifetime; abnormal unmount/remount cycles can leave it pre-set.

### Fix

- **Convert lazy import to static import** for `SonoPostExperienceModal`. The component is small (365 lines) and already used on this page — no meaningful bundle cost.
- **Move `<SonoPostExperienceModal>` outside the `guestPlayback` early-return branch** — render it at the root level of the component so it is always in the tree. The `open` prop controls visibility; portal rendering (`createPortal(document.body)`) means placement in the tree has no visual effect.

```tsx
// Before
if (guestPlayback) {
  return <GuestSonoPlayer ... />;
}
// ... rest of page
// <SonoPostExperienceModal open={showOfferModal} ... />  ← never reached

// After
return (
  <>
    {guestPlayback ? (
      <GuestSonoPlayer ... />
    ) : (
      <div ...> {/* main page */} </div>
    )}
    <SonoPostExperienceModal open={showOfferModal} ... />
  </>
);
```

`handleGuestNight1Complete` stays unchanged — it already calls `setShowOfferModal(true)`.

---

## Section 2 — Updated Modal Copy (`SonoPostExperienceModal`)

Replace `MAIN_OFFER_COPY` constant:

```typescript
const MAIN_OFFER_COPY = {
  eyebrow: 'Noite 1 concluída',
  title: 'Seu corpo acabou de dar o primeiro passo.',
  subtitle:
    'Esta primeira noite foi criada para tirar seu sistema nervoso do modo alerta. Mas o sono profundo raramente muda em uma única tentativa. Ele é treinado por repetição, segurança e continuidade.',
  body: '',  // empty — night breakdown replaces body prose
  offerTitle: 'Protocolo Sono Profundo — 7 noites',
  price: 'R$97',
  supportingText: 'Pagamento único • Sem mensalidade',
  cta: 'Liberar protocolo completo por R$97',
  microcopy: 'Acesso imediato após o pagamento. Você continua exatamente de onde parou.',
};
```

Replace the generic lock-icon row with a night breakdown list (rendered in the `offer` step):

```
✅  Noite 1 — Desligando o estado de alerta
🔒  Noite 2 — Soltando o controle da mente
🔒  Noite 3 — Desligamento profundo do corpo
🔒  Noite 4 — Quebrando o ciclo de pensamentos
🔒  Noite 5 — Entrando em segurança profunda
🔒  Noite 6 — Quando o sono começa sozinho
🔒  Noite 7 — Seu corpo já sabe dormir
```

The quiz step copy is unchanged.

---

## Section 3 — New Component: `SleepProtocolOfferCard`

**File:** `src/components/sono/SleepProtocolOfferCard.tsx`

**Props:**
```typescript
interface SleepProtocolOfferCardProps {
  onStart: () => void;      // triggers Night 1 playback
  onCheckout: () => void;   // opens Pix/checkout
  checkoutLoading?: boolean;
}
```

**Copy:**
```
Headline:    "Experimente a primeira noite gratuitamente."
Body:        "Em 8 minutos, você vai conduzir seu corpo para fora do
              estado de alerta e iniciar um ritual de desaceleração
              profunda. Ao final da experiência, você poderá liberar
              o protocolo completo de 7 noites."
Label:       "Protocolo Sono Profundo — 7 noites guiadas"
Price:       "R$97"
CTA 1:       "Começar experiência gratuita →"   → calls onStart
CTA 2:       "Liberar protocolo completo"        → calls onCheckout
Microcopy:   "Pagamento seguro via Pix/cartão."
```

**Visual:** Dark card (`rgba(255,255,255,0.035)` background, amber border accent), consistent with the page's amber/dark palette. No fixed height. Padding `px-5 py-6`. `rounded-3xl`.

**Placement in `SleepMeditationExperience`:** After the Nights 2–7 grid section, before the progress block. Condition: `isGuestSono && !isPaid`.

```tsx
{isGuestSono && !isPaid && (
  <section className="mx-auto max-w-lg px-4 pt-6 pb-12 sm:px-6">
    <SleepProtocolOfferCard
      onStart={handleHeroButtonClick}
      onCheckout={() => openCheckout({ origin: 'sono_guest_landing_card' })}
      checkoutLoading={checkoutLoading}
    />
  </section>
)}
```

---

## Section 4 — Scroll Fix

### Investigation targets (in order)

1. **`.page-with-nav` CSS class** — Check in global CSS / Tailwind config. Remove any `overflow-hidden`, `height`, or `max-height` that constrains the scroll container.
2. **`SonoGuestShell` wrapper** — Check in `App.tsx` and the shell component itself for `h-screen overflow-hidden` or `fixed` positioning on the page wrapper.
3. **Hero section `overflow-hidden`** — The hero has `overflow-hidden` for its background blobs. This is correct and should not be changed. Only the outer wrapper matters.

### Fix pattern

Any wrapper with:
```css
h-screen / height: 100vh / overflow-hidden / max-h-screen
```
→ replace with:
```css
min-h-screen / overflow-y-auto / (remove overflow-hidden)
```

Add `pb-24` to `<main>` to prevent bottom content from being hidden behind any sticky bars.

---

## Acceptance Criteria

- [ ] Guest lands on `/sono/experiencia`, can scroll to bottom of page
- [ ] `SleepProtocolOfferCard` visible below the Nights 2–7 grid for guests
- [ ] "Começar experiência gratuita" starts Night 1 playback
- [ ] "Liberar protocolo completo" opens Pix checkout
- [ ] Guest completes Night 1 (≥95% audio) → `SonoPostExperienceModal` opens automatically
- [ ] Modal shows quiz step first, then offer step with new copy and night breakdown
- [ ] "Liberar protocolo completo por R$97" button opens checkout
- [ ] Logged-in paid users see no offer card and no offer modal
- [ ] No offer appears mid-meditation
- [ ] No duplicate offers
