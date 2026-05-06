# Sleep Meditation Flow Unification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify sleep meditation into a single `SleepMeditationExperience` component served by two official routes — `/app/meditacoes-sono` (authenticated) and `/sono/experiencia` (public guest funnel) — eliminating the duplicate `/app/meditacoes/sono` guest route.

**Architecture:** Extract the logic from `MeditacoesSonoPage.tsx` into a shared `SleepMeditationExperience` component that accepts an explicit `mode: "app" | "guest"` prop, replacing the current auto-detection heuristics. Two thin wrapper pages render it in each context. All internal app links that pointed at the old guest route are updated to the authenticated route.

**Tech Stack:** React 18, TypeScript, React Router v6, Framer Motion, Tailwind CSS, Vitest + React Testing Library

---

## File Map

| Action | Path |
|--------|------|
| **Create** | `src/components/sleep/SleepMeditationExperience.tsx` |
| **Create** | `src/pages/sleep/SleepMeditationsPage.tsx` |
| **Create** | `src/pages/sleep/SleepGuestExperiencePage.tsx` |
| **Modify** | `src/App.tsx` |
| **Modify** | `src/layouts/MainLayout.tsx` |
| **Modify** | `src/components/BottomNav.tsx` |
| **Modify** | `src/components/sono/SonoPostExperienceModal.tsx` |
| **Delete** | `src/pages/MeditacoesSonoPage.tsx` |
| **Delete** | `src/components/sono/SonoCutoffQuizOffer.tsx` |

---

## Task 1: Remove unused cutoff offer files

`SonoCutoffQuizOffer.tsx` is defined but never imported by anything. The `cutoff` variant in `SonoPostExperienceModal` is defined but never triggered (no 4-minute timer exists). Remove both to match the user-spec: offer only shows at audio end.

**Files:**
- Delete: `src/components/sono/SonoCutoffQuizOffer.tsx`
- Modify: `src/components/sono/SonoPostExperienceModal.tsx`

- [ ] **Step 1: Verify SonoCutoffQuizOffer has no importers**

```bash
grep -r "SonoCutoffQuizOffer" src/
```

Expected: only its own file appears. If another file imports it, stop and report before proceeding.

- [ ] **Step 2: Delete the unused file**

```bash
rm src/components/sono/SonoCutoffQuizOffer.tsx
```

- [ ] **Step 3: Remove `cutoff` from SonoPostExperienceModal**

In `src/components/sono/SonoPostExperienceModal.tsx`, make these exact changes:

Change the type export (line 14):
```typescript
// BEFORE
export type SonoOfferVariant = 'cutoff' | 'final' | 'locked_night';

// AFTER
export type SonoOfferVariant = 'final' | 'locked_night';
```

Remove the `onCutoffDismiss` prop from the interface:
```typescript
// BEFORE
interface SonoPostExperienceModalProps {
  open: boolean;
  onClose: () => void;
  onCheckout: () => void;
  checkoutLoading: boolean;
  variant?: SonoOfferVariant;
  guestId?: string;
  source?: string;
  startWithQuiz?: boolean;
  onCutoffDismiss?: () => void;
}

// AFTER
interface SonoPostExperienceModalProps {
  open: boolean;
  onClose: () => void;
  onCheckout: () => void;
  checkoutLoading: boolean;
  variant?: SonoOfferVariant;
  guestId?: string;
  source?: string;
  startWithQuiz?: boolean;
}
```

Remove `onCutoffDismiss` from the destructured params and the function signature:
```typescript
// BEFORE
export function SonoPostExperienceModal({
  open,
  onClose,
  onCheckout,
  checkoutLoading,
  variant = 'final',
  guestId = ...,
  source = 'quiz_sono_guest',
  startWithQuiz = false,
  onCutoffDismiss,
}: SonoPostExperienceModalProps) {

// AFTER
export function SonoPostExperienceModal({
  open,
  onClose,
  onCheckout,
  checkoutLoading,
  variant = 'final',
  guestId = ...,
  source = 'quiz_sono_guest',
  startWithQuiz = false,
}: SonoPostExperienceModalProps) {
```

Simplify the `handleClose` function (remove the `cutoff` branch):
```typescript
// BEFORE
const handleClose = () => {
  if (variant === 'cutoff') {
    mixpanel.track('Sleep Offer Dismissed', {
      guest_id: guestId,
      source,
      product_key: PRODUCT_KEY,
      context: 'cutoff_offer',
    });
    trackSonoGuestOfferDismissed({ guestId, source, context: 'cutoff_offer' });
    onCutoffDismiss?.();
    return;
  }
  mixpanel.track('Sleep Offer Dismissed', {
    guest_id: guestId,
    source,
    product_key: PRODUCT_KEY,
    context: variant,
  });
  trackSonoGuestOfferDismissed({ guestId, source, context: variant });
  onClose();
};

// AFTER
const handleClose = () => {
  mixpanel.track('Sleep Offer Dismissed', {
    guest_id: guestId,
    source,
    product_key: PRODUCT_KEY,
    context: variant,
  });
  trackSonoGuestOfferDismissed({ guestId, source, context: variant });
  onClose();
};
```

Simplify `handleCheckout` (remove the `cutoff` branch check):
```typescript
// BEFORE
const handleCheckout = () => {
  mixpanel.track('Sleep Offer CTA Clicked', {
    guest_id: guestId,
    source,
    product_key: PRODUCT_KEY,
    context: variant === 'cutoff' ? 'cutoff_offer' : variant,
  });
  trackSonoGuestCheckoutClicked({
    guestId,
    source,
    context: variant === 'cutoff' ? 'cutoff_offer' : variant,
  });
  onCheckout();
};

// AFTER
const handleCheckout = () => {
  mixpanel.track('Sleep Offer CTA Clicked', {
    guest_id: guestId,
    source,
    product_key: PRODUCT_KEY,
    context: variant,
  });
  trackSonoGuestCheckoutClicked({ guestId, source, context: variant });
  onCheckout();
};
```

Remove the cutoff branch from the `offer` useMemo (it should only handle `'final'` and `'locked_night'`, with a fallback):
```typescript
// BEFORE
const offer = useMemo(() => {
  if (variant === 'locked_night') { ... }
  if (variant === 'final') { return MAIN_OFFER_COPY; }
  return { eyebrow: 'Continuidade', ... };  // cutoff fallback
}, [answer, variant]);

// AFTER
const offer = useMemo(() => {
  if (variant === 'locked_night') {
    return {
      eyebrow: 'Noites 2 a 7',
      title: 'Continue de onde seu corpo parou.',
      subtitle:
        'A primeira noite iniciou o processo. As próximas aprofundam a resposta de relaxamento até o sono começar a vir com menos esforço.',
      body: MAIN_OFFER_COPY.supportingText,
      cta: 'Desbloquear protocolo completo',
    };
  }
  return MAIN_OFFER_COPY;
}, [variant]);
```

Note: after this change, `answer` and `startWithQuiz` state are no longer used in the offer. But the quiz step still shows when `startWithQuiz=true` and the answer affects the quiz UX — keep that logic intact. The only change is in the `offer` useMemo.

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no new errors. Fix any that appear.

- [ ] **Step 5: Commit**

```bash
git add src/components/sono/SonoPostExperienceModal.tsx
git rm src/components/sono/SonoCutoffQuizOffer.tsx
git commit -m "refactor: remove unused cutoff offer logic from sleep modal"
```

---

## Task 2: Create `SleepMeditationExperience` component

The component is a direct refactor of `MeditacoesSonoPage.tsx`. Instead of auto-detecting guest mode via URL and localStorage, it accepts an explicit `mode: "app" | "guest"` prop.

**Files:**
- Create: `src/components/sleep/SleepMeditationExperience.tsx`

- [ ] **Step 1: Copy MeditacoesSonoPage as the starting point**

```bash
mkdir -p src/components/sleep
cp src/pages/MeditacoesSonoPage.tsx src/components/sleep/SleepMeditationExperience.tsx
```

- [ ] **Step 2: Update the component interface and signature**

At the top of `src/components/sleep/SleepMeditationExperience.tsx`, add the props interface just before the component declaration. Find the existing import block and the function declaration, then apply these changes:

**Remove** the `useLocation` import (no longer needed for path detection):

```typescript
// BEFORE (in imports)
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';

// AFTER
import { useNavigate, useSearchParams } from 'react-router-dom';
```

**Add** the props interface and update the component signature (right before `export default function MeditacoesSonoPage()`):

```typescript
// BEFORE
export default function MeditacoesSonoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, isVipUser } = useAuth();
  const { hasAccess: hasSonoEntitlement } = useSonoEntitlement();
  const { loading: checkoutLoading, openCheckout } = useSonoCheckout();
  const isPaid = isVipUser || hasSonoEntitlement;
  const uid = user?.id || 'guest';

  // ── Guest sono mode detection ──────────────────────────────────
  const source = searchParams.get('source') || '';
  const isOfficialGuestRoute = location.pathname === '/app/meditacoes/sono';
  const isGuestSono =
    !user &&
    (isOfficialGuestRoute ||
      searchParams.get('guestSono') === '1' ||
      localStorage.getItem('sono_guest_mode') === 'true');

// AFTER
interface SleepMeditationExperienceProps {
  mode: 'app' | 'guest';
}

export function SleepMeditationExperience({ mode }: SleepMeditationExperienceProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isVipUser } = useAuth();
  const { hasAccess: hasSonoEntitlement } = useSonoEntitlement();
  const { loading: checkoutLoading, openCheckout } = useSonoCheckout();
  const isPaid = isVipUser || hasSonoEntitlement;
  const uid = user?.id || 'guest';

  // ── Mode: explicit via prop ──────────────────────────────────
  const source = searchParams.get('source') || '';
  const isGuestSono = mode === 'guest';
```

- [ ] **Step 3: Remove localStorage guest-mode side-effects that are no longer needed**

Find this `useEffect` block (it sets localStorage for detection — no longer needed since mode is explicit):

```typescript
// REMOVE this entire useEffect:
useEffect(() => {
  if (!isGuestSono) return;
  localStorage.setItem('sono_guest_mode', 'true');
  localStorage.setItem('sono_guest_started_at', new Date().toISOString());
  sessionStorage.setItem('eco.sono.guest_id', guestId);
  sessionStorage.setItem('eco.sono.source', source || 'sono_paid_traffic');
  const resolvedSource = source || 'sono_paid_traffic';
  const track = () => {
    mixpanel.track('Sleep Guest Page Viewed', { source: resolvedSource, guest_id: guestId, product_key: 'protocolo_sono_7_noites' });
    trackSonoGuestPageViewed({ source: resolvedSource, guestId });
  };
  if ('requestIdleCallback' in window) requestIdleCallback(track);
  else setTimeout(track, 300);
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

**Replace** with a leaner version that keeps session tracking + analytics but removes localStorage mode flag:

```typescript
useEffect(() => {
  if (!isGuestSono) return;
  sessionStorage.setItem('eco.sono.guest_id', guestId);
  sessionStorage.setItem('eco.sono.source', source || 'sono_paid_traffic');
  const resolvedSource = source || 'sono_paid_traffic';
  const track = () => {
    mixpanel.track('Sleep Guest Page Viewed', { source: resolvedSource, guest_id: guestId, product_key: 'protocolo_sono_7_noites' });
    trackSonoGuestPageViewed({ source: resolvedSource, guestId });
  };
  if ('requestIdleCallback' in window) requestIdleCallback(track);
  else setTimeout(track, 300);
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 4: Remove the default export, keep only the named export**

At the bottom of the file there should be `export default function MeditacoesSonoPage()` — we already changed the signature in Step 2, but make sure there is NO `export default` in the file. The function is now `export function SleepMeditationExperience`.

- [ ] **Step 5: TypeScript check on the new file**

```bash
npx tsc --noEmit 2>&1 | grep "SleepMeditationExperience"
```

Expected: no errors. Fix any import mismatches.

- [ ] **Step 6: Commit**

```bash
git add src/components/sleep/SleepMeditationExperience.tsx
git commit -m "feat: create SleepMeditationExperience component with explicit mode prop"
```

---

## Task 3: Create thin page wrappers

**Files:**
- Create: `src/pages/sleep/SleepMeditationsPage.tsx`
- Create: `src/pages/sleep/SleepGuestExperiencePage.tsx`

- [ ] **Step 1: Create authenticated wrapper**

```bash
mkdir -p src/pages/sleep
```

Create `src/pages/sleep/SleepMeditationsPage.tsx`:

```typescript
import { SleepMeditationExperience } from '@/components/sleep/SleepMeditationExperience';

export default function SleepMeditationsPage() {
  return <SleepMeditationExperience mode="app" />;
}
```

- [ ] **Step 2: Create guest wrapper**

Create `src/pages/sleep/SleepGuestExperiencePage.tsx`:

```typescript
import { SleepMeditationExperience } from '@/components/sleep/SleepMeditationExperience';

export default function SleepGuestExperiencePage() {
  return <SleepMeditationExperience mode="guest" />;
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "sleep/"
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/sleep/
git commit -m "feat: add SleepMeditationsPage and SleepGuestExperiencePage wrappers"
```

---

## Task 4: Update App.tsx routes

**Files:**
- Modify: `src/App.tsx`

Four changes: (a) swap lazy imports, (b) add `/sono/experiencia` public route, (c) redirect old guest route, (d) update authenticated route, (e) fix GuestSignupModal path check.

- [ ] **Step 1: Replace lazy imports**

Find:
```typescript
const MeditacoesSonoPage = lazy(() => import("@/pages/MeditacoesSonoPage"));
```

Replace with:
```typescript
const SleepMeditationsPage = lazy(() => import("@/pages/sleep/SleepMeditationsPage"));
const SleepGuestExperiencePage = lazy(() => import("@/pages/sleep/SleepGuestExperiencePage"));
```

- [ ] **Step 2: Add `/sono/experiencia` as a new public route**

The route must appear BEFORE the `/app/*` block (same pattern as `/app/meditacoes/sono` today). Find the block that starts the sono guest shell:

```typescript
<Route path="/app/meditacoes/sono" element={<SonoGuestShell />}>
  <Route index element={renderWithSuspense(<MeditacoesSonoPage />)} />
</Route>
```

Replace it with:

```typescript
{/* ── /sono/experiencia — public guest funnel (official) ── */}
<Route path="/sono/experiencia" element={<SonoGuestShell />}>
  <Route index element={renderWithSuspense(<SleepGuestExperiencePage />)} />
</Route>

{/* ── /app/meditacoes/sono — legacy redirect ── */}
<Route path="/app/meditacoes/sono" element={<Navigate to="/sono/experiencia" replace />} />
```

- [ ] **Step 3: Update the authenticated `/app/meditacoes-sono` route**

Find:
```typescript
<Route
  path="/app/meditacoes-sono"
  element={
    <RequireAuth>
      <AppProtectedShellNoLayout />
    </RequireAuth>
  }
>
  <Route index element={renderWithSuspense(<MeditacoesSonoPage />)} />
</Route>
```

Replace `<MeditacoesSonoPage />` with `<SleepMeditationsPage />`:

```typescript
<Route
  path="/app/meditacoes-sono"
  element={
    <RequireAuth>
      <AppProtectedShellNoLayout />
    </RequireAuth>
  }
>
  <Route index element={renderWithSuspense(<SleepMeditationsPage />)} />
</Route>
```

- [ ] **Step 4: Update GuestSignupModal path suppression**

Find (around line 462):
```typescript
if (location.pathname === '/app/meditacoes/sono') return; // Funil Sono guest sem cadastro/interrupções
```

Replace:
```typescript
if (location.pathname === '/sono/experiencia') return; // Funil Sono guest sem cadastro/interrupções
```

- [ ] **Step 5: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors. If `MeditacoesSonoPage` is referenced anywhere else in App.tsx, remove those references.

- [ ] **Step 6: Run lint**

```bash
npm run lint
```

Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add /sono/experiencia route, redirect legacy guest route, update auth sono route"
```

---

## Task 5: Update BottomNav, MainLayout, and internal links

These files reference `/app/meditacoes/sono` as a navigation target inside the app. Authenticated users should always land on `/app/meditacoes-sono`; the public funnel route is only for external links.

**Files:**
- Modify: `src/components/BottomNav.tsx`
- Modify: `src/layouts/MainLayout.tsx`

- [ ] **Step 1: Fix BottomNav link**

In `src/components/BottomNav.tsx`, find:

```typescript
{ to: '/app/meditacoes/sono', icon: Moon,  label: 'Sono',     end: false },
```

Replace:

```typescript
{ to: '/app/meditacoes-sono', icon: Moon,  label: 'Sono',     end: false },
```

- [ ] **Step 2: Fix MainLayout `isSonoPage` check**

In `src/layouts/MainLayout.tsx`, find the `isSonoPage` variable (lines 50-52):

```typescript
const isSonoPage =
  location.pathname.startsWith('/app/meditacoes-sono') ||
  location.pathname.startsWith('/app/meditacoes/sono');
```

Replace (add new public route, remove old guest route):

```typescript
const isSonoPage =
  location.pathname.startsWith('/app/meditacoes-sono') ||
  location.pathname.startsWith('/sono/experiencia');
```

- [ ] **Step 3: Find and fix any remaining internal navigate calls**

Run:

```bash
grep -rn "meditacoes/sono" src/ --include="*.tsx" --include="*.ts"
```

For each occurrence:
- If the file is in an app/authenticated context (e.g., `HomePage.tsx`, `HeroCarousel.tsx`): change navigate target to `'/app/meditacoes-sono'`
- If the file is for a public/guest context: change target to `'/sono/experiencia'`

The two known occurrences are:
- `src/pages/HomePage.tsx` line 418: `navigate('/app/meditacoes/sono')` → `navigate('/app/meditacoes-sono')` (HomePage inside app is shown to authenticated users)
- `src/components/home/HeroCarousel.tsx` line 365: same change to `'/app/meditacoes-sono'`

After editing, re-run:

```bash
grep -rn "meditacoes/sono" src/ --include="*.tsx" --include="*.ts"
```

Expected: zero results (only App.tsx's Navigate redirect should remain, but that's handled in Task 4).

- [ ] **Step 4: Run TypeScript + lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/BottomNav.tsx src/layouts/MainLayout.tsx src/pages/HomePage.tsx src/components/home/HeroCarousel.tsx
git commit -m "fix: update internal sono links from old guest route to authenticated route"
```

---

## Task 6: Delete MeditacoesSonoPage.tsx

The old file is now replaced by `SleepMeditationExperience.tsx` + the two page wrappers. Nothing should import it anymore.

**Files:**
- Delete: `src/pages/MeditacoesSonoPage.tsx`

- [ ] **Step 1: Verify no remaining imports**

```bash
grep -rn "MeditacoesSonoPage" src/ --include="*.tsx" --include="*.ts"
```

Expected: zero results. If any remain, fix them first.

- [ ] **Step 2: Delete the file**

```bash
git rm src/pages/MeditacoesSonoPage.tsx
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor: delete MeditacoesSonoPage (replaced by SleepMeditationExperience)"
```

---

## Task 7: Smoke-test both flows manually

No new automated tests are needed for this refactor — the component logic is unchanged. Verify that the two routes work correctly.

**Files:** None (manual verification)

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test guest funnel flow**

1. Open browser in incognito (no auth session)
2. Navigate to `http://localhost:5173/sono/experiencia`
3. Verify:
   - Page loads (dark background, hero, Night 1 card, pill "Protocolo Sono Profundo • Noite 1 gratuita")
   - No "Iniciar Noite 1 gratuita" CTA or similar appears blocked
   - Click "Iniciar Noite 1 gratuita" → `GuestSonoPlayer` opens
   - Audio plays, progress bar moves
   - When audio reaches 95%: `SonoPostExperienceModal` appears with `variant='final'`
   - "Continuar o processo completo" button triggers checkout flow
4. Navigate to `http://localhost:5173/app/meditacoes/sono`
   - Verify redirect lands on `/sono/experiencia` (check browser URL bar)

- [ ] **Step 3: Test authenticated flow**

1. Log in with test credentials
2. Navigate to `http://localhost:5173/app/meditacoes-sono`
3. Verify:
   - Page loads with `HomeHeader` visible
   - Protocol shows correct access state for the user
   - Click Night 1 → navigates to `/app/meditation-player` with correct state
   - After meditation, return navigates back to `/app/meditacoes-sono`
4. Click "Sono" in BottomNav
   - Verify it opens `/app/meditacoes-sono` (not the old guest route)

- [ ] **Step 4: Test post-purchase redirect**

If a test purchase is available:
- Verify `SonoObrigadoPage` still redirects to `/app/meditacoes-sono` after claim

- [ ] **Step 5: Commit completion note**

```bash
git commit --allow-empty -m "chore: smoke test passed — sleep meditation flow unified"
```

---

## Post-plan: Landing page update (manual, outside this codebase)

Any external landing pages that link to `/app/meditacoes/sono` should be updated to `/sono/experiencia`. The React Router redirect handles existing bookmarks, but update proactively:

- Meta Ads destination URL
- Landing page CTA href
- Any email links with the old URL

---

## Self-review checklist

| Requirement | Task |
|---|---|
| `/sono/experiencia` public route | Task 4 |
| `/app/meditacoes-sono` auth route | Tasks 2, 3, 4 |
| `SleepMeditationExperience` with `mode` prop | Task 2 |
| Thin page wrappers | Task 3 |
| Redirect `/app/meditacoes/sono` | Task 4 |
| No offer at 4 minutes (cutoff removed) | Task 1 |
| Price R$97 (already correct — verify) | Task 7 |
| Offer shows only at audio end (already correct) | Task 7 |
| BottomNav updated | Task 5 |
| Internal nav links updated | Task 5 |
| Old `MeditacoesSonoPage.tsx` deleted | Task 6 |
| `SonoCutoffQuizOffer.tsx` deleted | Task 1 |
