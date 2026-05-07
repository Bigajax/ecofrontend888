# Sleep Guest Offer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the offer modal not appearing after Night 1 guest meditation, update offer copy, add an inline offer card to the guest landing page, and fix the landing page scroll.

**Architecture:** Three independent changes — (1) move `SonoPostExperienceModal` out of the conditional early-return so it is always in the React tree; (2) update copy constants and replace the generic lock-icon row with a titled night breakdown; (3) create `SleepProtocolOfferCard` as a new inline component added to the guest landing page below the Nights 2–7 grid.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Framer Motion, Vitest + React Testing Library

---

## File Map

| Action | File |
|---|---|
| Modify | `src/components/sleep/SleepMeditationExperience.tsx` |
| Modify | `src/components/sono/SonoPostExperienceModal.tsx` |
| Create | `src/components/sono/SleepProtocolOfferCard.tsx` |
| Create | `src/components/sono/__tests__/SleepProtocolOfferCard.test.tsx` |

---

## Task 1: Fix modal trigger — static import + always-in-tree render

> **Dependency note:** The render block in Step 2 below already includes the `SleepProtocolOfferCard` section (created in Task 3) and its import. If you prefer strict ordering, do Task 3 before Task 1. If you do Task 1 first, TypeScript will complain about `SleepProtocolOfferCard` not found — that error is expected and resolved once Task 3 is complete. The lint check in Step 3 should be run after Task 3.

**Files:**
- Modify: `src/components/sleep/SleepMeditationExperience.tsx`

The modal is currently lazy-imported inside a `Suspense fallback={null}`, and the component does an early return for `guestPlayback` that leaves the modal outside the React tree. When `handleGuestNight1Complete` sets `showOfferModal=true` and `guestPlayback=null` simultaneously, a timing edge case can cause the modal to mount and immediately unmount. Fix: static import + always render the modal regardless of player state.

- [ ] **Step 1: Change the import — remove lazy/Suspense, add static import**

In `src/components/sleep/SleepMeditationExperience.tsx`, replace lines 1 and 24–26:

```tsx
// Line 1 — remove lazy and Suspense from React imports:
import { useState, useEffect, useMemo, useCallback } from 'react';

// Lines 24–26 — remove the lazy() call entirely:
// DELETE:
// const SonoPostExperienceModal = lazy(() =>
//   import('@/components/sono/SonoPostExperienceModal').then(m => ({ default: m.SonoPostExperienceModal }))
// );

// ADD at the top with the other named imports (after line 22):
import { SonoPostExperienceModal } from '@/components/sono/SonoPostExperienceModal';
```

- [ ] **Step 2: Restructure render — move modal outside the early-return**

Replace the `if (guestPlayback)` early return block (currently lines 310–318) and the final `return (...)` (lines 377–995) with a single unified return. The key change: the `GuestSonoPlayer` goes inside a ternary, the `SonoPostExperienceModal` moves to the fragment root alongside it.

The new structure for the bottom half of the component (replace everything from `if (guestPlayback)` down to the closing `}`):

```tsx
  // ── Render ──────────────────────────────────────────────────────
  if (showCompletion) {
    return (
      <div
        className="font-primary flex flex-col items-center justify-center px-6 text-center"
        style={{
          minHeight: '100dvh',
          background: `linear-gradient(160deg, ${T.bg0} 0%, ${T.bg1} 40%, ${T.bg2} 100%)`,
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        <motion.div
          className="max-w-sm w-full"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 70, damping: 20 }}
        >
          <div className="text-6xl mb-6">🌙</div>
          <h1 className="font-display text-[28px] font-bold text-white sm:text-[32px] mb-4 leading-tight">
            Protocolo Concluído
          </h1>
          <p className="text-[15px] text-white/55 leading-relaxed mb-8">
            Você recondicionou seu sistema para o descanso.<br />
            Agora você possui ferramentas para dormir sem depender do áudio.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/app')}
              className="w-full rounded-full px-6 py-3.5 text-[15px] font-bold transition-all hover:scale-105 active:scale-95"
              style={{
                background: `linear-gradient(135deg, ${T.amberLight} 0%, ${T.amber} 100%)`,
                color: '#0D1120',
                boxShadow: `0 6px 24px ${T.amberGlow}0.30)`,
              }}
            >
              Explorar outros programas
            </button>
            <button
              onClick={() => navigate(SUBSCRIPTION_PATH)}
              className="w-full rounded-full border px-6 py-3.5 text-[15px] font-semibold text-white/70 transition-all hover:text-white active:scale-95"
              style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)' }}
            >
              Conhecer o Plano Completo
            </button>
          </div>
          <button
            onClick={() => setShowCompletion(false)}
            className="mt-6 text-[12px] text-white/30 underline underline-offset-2"
          >
            Ver protocolo novamente
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {/* Player — shown while audio is active */}
      {guestPlayback ? (
        <GuestSonoPlayer
          startTime={guestPlayback.startTime}
          onComplete={handleGuestNight1Complete}
          onBack={() => setGuestPlayback(null)}
        />
      ) : (
        /* ── Main landing page ── */
        <div
          className="font-primary"
          style={{
            minHeight: '100dvh',
            background: `linear-gradient(180deg, ${T.bg0} 0%, ${T.bg0} 38%, ${T.bg1} 55%, #09090E 75%, ${T.bg2} 100%)`,
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          {user && !isGuestSono && <HomeHeader />}

          <main className="page-with-nav pb-24">

            {/* HERO */}
            <section
              className="relative flex min-h-[720px] flex-col overflow-hidden sm:min-h-[800px]"
              style={{ paddingTop: 'env(safe-area-inset-top)' }}
            >
              {/* Back button */}
              {(!user || isGuestSono) && (
                <div className="absolute left-4 top-4 z-20 sm:left-6 sm:top-6">
                  <button
                    onClick={() => navigate(-1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-white/50 transition-all hover:text-white/80"
                    style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.09)' }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Background image */}
              <div
                className="absolute inset-0 bg-cover"
                style={{ backgroundImage: 'url("/images/meditacoes-sono-hero.webp")', backgroundPosition: 'center 30%', transform: 'scale(1.06)' }}
              />
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(to bottom, rgba(6,6,9,0.18) 0%, rgba(6,6,9,0.06) 22%, rgba(6,6,9,0.55) 58%, ${T.bg0} 100%)` }}
              />
              <div
                className="pointer-events-none absolute"
                style={{
                  bottom: '8%', left: '50%', transform: 'translateX(-50%)',
                  width: '280px', height: '180px', borderRadius: '50%',
                  background: `radial-gradient(ellipse, ${T.amberGlow}0.07) 0%, transparent 70%)`,
                  filter: 'blur(50px)',
                }}
              />

              <div className="relative z-10 mx-auto flex w-full max-w-sm flex-col items-center px-6 pt-32 pb-20 text-center sm:max-w-md sm:px-8 sm:pt-40">
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[10px] font-bold tracking-[0.18em] uppercase"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    color: 'rgba(255,255,255,0.55)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full animate-pulse"
                    style={{ background: T.amberLight, boxShadow: `0 0 5px ${T.amberGlow}0.60)` }}
                  />
                  {pillLabel}
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, delay: 0.1, ease: 'easeOut' }}
                  className="mt-5 font-display font-bold text-white leading-[1.06]"
                  style={{ fontSize: 'clamp(2.1rem, 7vw, 3.1rem)', textShadow: '0 4px 40px rgba(0,0,0,0.70), 0 1px 6px rgba(0,0,0,0.50)' }}
                >
                  Esta noite,<br />
                  <em style={{ color: T.ivory, fontStyle: 'italic' }}>sua mente descansa.</em>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
                  className="mt-4 text-[15px] leading-relaxed font-light"
                  style={{ color: 'rgba(255,255,255,0.46)' }}
                >
                  {heroSubtitle ?? <>7 minutos. Sem remédio.<br />Sem contar ovelhas.</>}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.55, delay: 0.3 }}
                  className="mt-5 flex items-center gap-2.5"
                >
                  <span style={{ color: '#FBBF24', fontSize: '14px', letterSpacing: '2px' }}>★★★★★</span>
                  <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.34)' }}>12.400+ pessoas dormindo melhor</span>
                </motion.div>

                {isPaid && completedCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.32 }}
                    className="mt-6 flex items-center gap-2 rounded-full px-4 py-2"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.11)' }}
                  >
                    <span className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.60)' }}>
                      {completedCount === 7 ? '✓ Protocolo concluído' : `${completedCount} de 7 noites concluídas`}
                    </span>
                  </motion.div>
                )}

                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, delay: 0.38, ease: 'easeOut' }}
                  onClick={handleHeroButtonClick}
                  disabled={checkoutLoading}
                  className="mt-6 flex w-full items-center justify-center gap-3 rounded-full py-4 text-[15px] font-bold transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] disabled:opacity-70"
                  style={{
                    background: `linear-gradient(135deg, ${T.amberLight} 0%, ${T.amber} 100%)`,
                    color: '#0D1120',
                    boxShadow: `0 10px 36px ${T.amberGlow}0.28), 0 2px 8px rgba(0,0,0,0.40)`,
                  }}
                >
                  {checkoutLoading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Play className="h-4 w-4" fill="currentColor" />
                  }
                  {heroCTALabel}
                </motion.button>

                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.48 }}
                  onClick={() => document.getElementById('sono-protocolo-completo')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="mt-3 w-full rounded-full py-3 text-[13px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.97]"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.13)',
                    color: 'rgba(255,255,255,0.55)',
                  }}
                >
                  Conhecer as próximas noites
                </motion.button>

                {!isPaid && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="mt-3 text-[11px]"
                    style={{ color: 'rgba(255,255,255,0.24)' }}
                  >
                    Sem cadastro · Sem cartão · Acesso imediato
                  </motion.p>
                )}
              </div>
            </section>

            {/* NIGHT 1 */}
            <section className="mx-auto max-w-lg px-4 pt-6 sm:px-6">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ type: 'spring', stiffness: 60, damping: 16 }}
                onClick={() => { const n = PROTOCOL_NIGHTS[0]; if (n) handleNightClick(n); }}
                className="group relative overflow-hidden rounded-[28px] cursor-pointer"
                style={{ height: '300px' }}
              >
                {PROTOCOL_NIGHTS[0]?.imageUrl ? (
                  <img
                    src={PROTOCOL_NIGHTS[0].imageUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                ) : (
                  <div className="absolute inset-0" style={{ background: PROTOCOL_NIGHTS[0]?.gradient }} />
                )}
                <div
                  className="absolute inset-0"
                  style={{ background: `linear-gradient(to bottom, rgba(6,6,9,0.04) 0%, rgba(6,6,9,0.20) 35%, rgba(6,6,9,0.96) 88%)` }}
                />

                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em]"
                    style={{
                      background: 'rgba(6,6,9,0.60)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.11)',
                      color: 'rgba(255,255,255,0.55)',
                    }}
                  >
                    <span className="h-1 w-1 rounded-full" style={{ background: T.amberLight }} />
                    Noite 1 de 7
                  </span>
                  {!isPaid && (
                    <div
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold"
                      style={{
                        background: `linear-gradient(135deg, ${T.amberLight} 0%, ${T.amber} 100%)`,
                        color: '#0D1120',
                        boxShadow: `0 4px 14px ${T.amberGlow}0.35)`,
                      }}
                    >
                      ★ Grátis
                    </div>
                  )}
                  {isPaid && night1IsCompleted && (
                    <div
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold"
                      style={{ background: 'rgba(52,211,153,0.18)', border: '1px solid rgba(52,211,153,0.35)', color: '#34D399' }}
                    >
                      <Check className="h-3 w-3" strokeWidth={2.5} />
                      Concluída
                    </div>
                  )}
                </div>

                <div className="absolute bottom-0 left-0 right-0 z-10 px-6 pb-6">
                  <h3
                    className="font-display text-[21px] font-bold text-white leading-snug mb-1"
                    style={{ textShadow: '0 2px 16px rgba(0,0,0,0.65)' }}
                  >
                    {PROTOCOL_NIGHTS[0]?.title ?? 'Desligando o Estado de Alerta'}
                  </h3>
                  <p className="text-[12px] mb-4" style={{ color: 'rgba(255,255,255,0.44)' }}>
                    {PROTOCOL_NIGHTS[0]?.description ?? 'Ensina seu sistema nervoso a reconhecer o sinal para dormir.'}
                  </p>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-full flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                      style={
                        isPaid && night1IsCompleted
                          ? { background: 'rgba(52,211,153,0.22)', boxShadow: '0 6px 24px rgba(52,211,153,0.28)', border: '1px solid rgba(52,211,153,0.40)' }
                          : {
                              background: `linear-gradient(135deg, ${T.amberLight} 0%, ${T.amber} 100%)`,
                              boxShadow: `0 6px 24px ${T.amberGlow}0.40)`,
                            }
                      }
                    >
                      {isPaid && night1IsCompleted
                        ? <Check className="h-5 w-5 text-emerald-400" strokeWidth={2.5} />
                        : <Play className="h-5 w-5 ml-0.5" fill="currentColor" style={{ color: '#0D1120' }} />
                      }
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-white">
                        {isPaid
                          ? night1IsCompleted ? 'Rever Noite 1' : 'Iniciar Noite 1'
                          : 'Iniciar agora — grátis'}
                      </p>
                      {!isPaid && (
                        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.34)' }}>
                          {isGuestSono ? 'Sem cadastro · Sem cartão' : 'Acesso imediato'}
                        </p>
                      )}
                      {isPaid && night1IsCompleted && (
                        <p className="text-[11px]" style={{ color: 'rgba(52,211,153,0.60)' }}>Concluída</p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </section>

            {/* BENEFITS */}
            <section className="mx-auto max-w-lg px-4 pt-8 sm:px-6">
              <motion.div
                className="space-y-3"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ type: 'spring', stiffness: 65, damping: 18 }}
              >
                {[
                  { icon: Moon,        text: 'Sua respiração desacelera — sem você tentar. Seu peito afrouxa. Os pensamentos perdem força.', color: T.steelSolid },
                  { icon: Wind,        text: 'Você para de calcular quantas horas de sono ainda dá pra pegar. Sua mente solta.',             color: T.steelSolid },
                  { icon: TrendingUp,  text: 'Cada noite aprofunda mais. No 7º dia, seu corpo já sabe o que fazer — sem o áudio.',          color: '#34D399' },
                ].map(({ icon: Icon, text, color }, i) => (
                  <motion.div
                    key={i}
                    className="flex items-start gap-4 rounded-2xl px-4 py-4"
                    style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-20px' }}
                    transition={{ type: 'spring', stiffness: 80, damping: 20, delay: i * 0.07 }}
                  >
                    <div
                      className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-xl"
                      style={{ background: `${color}14`, border: `1px solid ${color}22` }}
                    >
                      <Icon className="h-4 w-4" style={{ color }} />
                    </div>
                    <p className="text-[13px] leading-relaxed pt-0.5" style={{ color: 'rgba(255,255,255,0.46)' }}>{text}</p>
                  </motion.div>
                ))}
              </motion.div>
            </section>

            {/* NIGHTS 2–7 */}
            <section id="sono-protocolo-completo" className="mx-auto max-w-lg px-4 pt-10 sm:px-6">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ type: 'spring', stiffness: 65, damping: 18 }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="h-px flex-1"
                    style={{ background: `linear-gradient(to right, transparent, ${isPaid ? 'rgba(52,211,153,0.20)' : 'rgba(255,255,255,0.10)'})` }}
                  />
                  <div
                    className="flex items-center gap-2 rounded-full px-4 py-1.5"
                    style={{
                      background: isPaid ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${isPaid ? 'rgba(52,211,153,0.18)' : 'rgba(255,255,255,0.10)'}`,
                    }}
                  >
                    {isPaid
                      ? <Play className="h-3 w-3" style={{ color: 'rgba(52,211,153,0.65)' }} fill="currentColor" />
                      : <Lock className="h-3 w-3" style={{ color: 'rgba(255,255,255,0.35)' }} />
                    }
                    <span
                      className="text-[11px] font-bold uppercase tracking-widest"
                      style={{ color: isPaid ? 'rgba(52,211,153,0.65)' : 'rgba(255,255,255,0.35)' }}
                    >
                      {isPaid ? 'Noites 2 a 7 — Desbloqueadas' : 'Noites 2 a 7'}
                    </span>
                  </div>
                  <div
                    className="h-px flex-1"
                    style={{ background: `linear-gradient(to left, transparent, ${isPaid ? 'rgba(52,211,153,0.20)' : 'rgba(255,255,255,0.10)'})` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {PROTOCOL_NIGHTS.slice(1).map((night, idx) => {
                    const nightCompleted = completedNights.has(night.night);
                    return (
                      <motion.div
                        key={night.id}
                        initial={{ opacity: 0, scale: 0.96 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true, margin: '-20px' }}
                        transition={{ type: 'spring', stiffness: 80, damping: 20, delay: idx * 0.05 }}
                        onClick={() => handleNightClick(night)}
                        className="group relative overflow-hidden rounded-2xl cursor-pointer"
                        style={{ height: '130px' }}
                      >
                        {night.imageUrl ? (
                          <img
                            src={night.imageUrl}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="absolute inset-0 w-full h-full object-cover"
                            style={isPaid ? undefined : { filter: 'brightness(0.25) saturate(0.40)' }}
                          />
                        ) : (
                          <div className="absolute inset-0" style={{ background: night.gradient, opacity: isPaid ? 1 : 0.30 }} />
                        )}
                        <div
                          className="absolute inset-0"
                          style={{ background: 'linear-gradient(to bottom, transparent 15%, rgba(6,6,9,0.88) 100%)' }}
                        />

                        <div className="absolute inset-0 flex flex-col justify-between p-3.5">
                          <div className="flex items-center justify-between">
                            <span
                              className="text-[9px] font-bold uppercase tracking-wider"
                              style={{ color: isPaid ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.30)' }}
                            >
                              Noite {night.night}
                            </span>

                            {isPaid ? (
                              nightCompleted ? (
                                <div
                                  className="h-5 w-5 flex items-center justify-center rounded-full"
                                  style={{ background: 'rgba(52,211,153,0.22)', border: '1px solid rgba(52,211,153,0.40)' }}
                                >
                                  <Check className="h-2.5 w-2.5 text-emerald-400" strokeWidth={2.5} />
                                </div>
                              ) : (
                                <div
                                  className="h-5 w-5 flex items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110"
                                  style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)' }}
                                >
                                  <Play className="h-2.5 w-2.5 ml-px text-white/70" fill="currentColor" />
                                </div>
                              )
                            ) : (
                              <div
                                className="h-5 w-5 flex items-center justify-center rounded-full"
                                style={{ background: 'rgba(6,6,9,0.70)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.10)' }}
                              >
                                <Lock className="h-2.5 w-2.5 text-white/35" />
                              </div>
                            )}
                          </div>

                          <p
                            className="text-[11px] font-semibold leading-snug line-clamp-2"
                            style={{ color: isPaid ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.40)' }}
                          >
                            {night.title}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </section>

            {/* INLINE OFFER CARD — guest only */}
            {isGuestSono && !isPaid && (
              <section className="mx-auto max-w-lg px-4 pt-6 sm:px-6">
                <SleepProtocolOfferCard
                  onStart={handleHeroButtonClick}
                  onCheckout={() => openCheckout({ origin: 'sono_guest_landing_card' })}
                  checkoutLoading={checkoutLoading}
                />
              </section>
            )}

            {/* CONVERSION BLOCK — authenticated non-paid, night 1 done */}
            {!isGuestSono && !isPaid && night1IsCompleted && (
              <section className="mx-auto max-w-lg px-4 pt-6 pb-12 sm:px-6">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ type: 'spring', stiffness: 65, damping: 18, delay: 0.1 }}
                  className="relative overflow-hidden rounded-3xl px-6 py-7 text-center"
                  style={{
                    background: 'linear-gradient(160deg, rgba(14,12,9,0.97) 0%, rgba(8,8,11,0.99) 100%)',
                    border: `1px solid ${T.amberGlow}0.18)`,
                    boxShadow: `0 8px 40px rgba(0,0,0,0.30), inset 0 1px 0 ${T.amberGlow}0.06)`,
                  }}
                >
                  <div
                    className="pointer-events-none absolute"
                    style={{
                      top: '-50px', right: '-40px',
                      width: '180px', height: '180px', borderRadius: '50%',
                      background: `radial-gradient(circle, ${T.amberGlow}0.08) 0%, transparent 70%)`,
                    }}
                  />

                  <p className="text-[11px] uppercase tracking-[0.2em] font-bold mb-4" style={{ color: 'rgba(251,191,36,0.75)' }}>
                    Protocolo Sono Profundo
                  </p>
                  <div className="flex items-baseline justify-center gap-3 mb-1">
                    <span className="font-display text-[40px] font-bold text-white leading-none">R$97</span>
                  </div>
                  <p className="text-[12px] mb-3" style={{ color: 'rgba(255,255,255,0.28)' }}>7 noites completas · Pagamento único · Sem mensalidade</p>

                  <div className="mb-6" />

                  <button
                    onClick={() => openCheckout()}
                    disabled={checkoutLoading}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-[15px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 mb-3"
                    style={{
                      background: `linear-gradient(135deg, ${T.amberLight} 0%, ${T.amber} 100%)`,
                      color: '#0D1120',
                      boxShadow: `0 10px 32px ${T.amberGlow}0.32)`,
                    }}
                  >
                    {checkoutLoading
                      ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Abrindo...</span>
                      : 'Continuar o processo completo'}
                  </button>
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.24)' }}>Acesso imediato · 7 noites completas · Garantia de 7 dias</p>
                </motion.div>
              </section>
            )}

            {/* PROGRESS BLOCK — paid users */}
            {isPaid && (
              <section className="mx-auto max-w-lg px-4 pt-6 pb-12 sm:px-6">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ type: 'spring', stiffness: 65, damping: 18 }}
                  className="rounded-3xl px-6 py-6"
                  style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[13px] font-semibold text-white/65">
                      {completedCount === 7 ? 'Programa concluído!' : `Noite ${nextNight} de 7`}
                    </p>
                    <span className="text-[13px] font-bold" style={{ color: T.amberLight }}>{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${T.amberLight}, ${T.amber})` }}
                    />
                  </div>
                  <p className="mt-2 text-[12px] text-white/30">{completedCount} de 7 noites concluídas</p>
                </motion.div>
              </section>
            )}

          </main>

          <AnimatePresence>
            {showStartNightPrompt && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-end justify-center p-4 sm:items-center"
                style={{ background: 'rgba(3,6,18,0.72)', backdropFilter: 'blur(12px)' }}
                role="dialog"
                aria-modal="true"
              >
                <motion.div
                  initial={{ opacity: 0, y: 18, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 18, scale: 0.97 }}
                  transition={{ duration: 0.22 }}
                  className="w-full max-w-sm rounded-3xl px-6 py-7 text-center"
                  style={{
                    background: 'linear-gradient(160deg, #070B1D 0%, #050817 58%, #101733 100%)',
                    border: '1px solid rgba(196,181,253,0.18)',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.62)',
                  }}
                >
                  <h2 className="font-display mb-3 text-[24px] font-bold leading-tight text-white">
                    Comece pela Noite 1 gratuita.
                  </h2>
                  <p className="mb-6 text-[14px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.54)' }}>
                    Ela prepara seu corpo para as próximas etapas.
                  </p>
                  <button
                    onClick={() => {
                      setShowStartNightPrompt(false);
                      handleStartNight1();
                    }}
                    className="mb-3 w-full rounded-full py-4 text-[15px] font-bold transition-transform active:scale-[0.98]"
                    style={{
                      background: `linear-gradient(135deg, ${T.amberLight} 0%, ${T.amber} 100%)`,
                      color: '#0D1120',
                      boxShadow: `0 10px 32px ${T.amberGlow}0.30)`,
                    }}
                  >
                    Iniciar Noite 1
                  </button>
                  <button
                    onClick={() => setShowStartNightPrompt(false)}
                    className="w-full py-2 text-[13px]"
                    style={{ color: 'rgba(255,255,255,0.36)' }}
                  >
                    Agora não
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Modal — always in tree so it can open regardless of player state */}
      <SonoPostExperienceModal
        open={showOfferModal}
        variant={offerVariant}
        guestId={guestId}
        source={source || 'sono_paid_traffic'}
        onClose={() => setShowOfferModal(false)}
        onCheckout={() => openCheckout({ origin: 'sono_guest_final_offer' })}
        checkoutLoading={checkoutLoading}
        startWithQuiz={isGuestSono && offerVariant === 'final'}
      />
    </>
  );
}
```

Also add the import for `SleepProtocolOfferCard` at the top of the file (after the existing imports):

```tsx
import { SleepProtocolOfferCard } from '@/components/sono/SleepProtocolOfferCard';
```

- [ ] **Step 3: Run TypeScript check**

```bash
npm run lint
```

Expected: no errors about `lazy`, `Suspense`, or missing imports.

- [ ] **Step 4: Commit**

```bash
git add src/components/sleep/SleepMeditationExperience.tsx
git commit -m "fix: move SonoPostExperienceModal outside guestPlayback early-return so offer appears after Night 1"
```

---

## Task 2: Update SonoPostExperienceModal copy + night breakdown

**Files:**
- Modify: `src/components/sono/SonoPostExperienceModal.tsx`

- [ ] **Step 1: Replace MAIN_OFFER_COPY constant**

In `src/components/sono/SonoPostExperienceModal.tsx`, replace lines 38–50 (the `MAIN_OFFER_COPY` object):

```typescript
const MAIN_OFFER_COPY = {
  eyebrow: 'Noite 1 concluída',
  title: 'Seu corpo acabou de dar o primeiro passo.',
  subtitle:
    'Esta primeira noite foi criada para tirar seu sistema nervoso do modo alerta. Mas o sono profundo raramente muda em uma única tentativa. Ele é treinado por repetição, segurança e continuidade.',
  body: '',
  offerTitle: 'Protocolo Sono Profundo — 7 noites',
  price: 'R$97',
  supportingText: 'Pagamento único • Sem mensalidade',
  cta: 'Liberar protocolo completo por R$97',
  microcopy: 'Acesso imediato após o pagamento. Você continua exatamente de onde parou.',
};
```

- [ ] **Step 2: Add night breakdown constant**

Add this constant directly after `MAIN_OFFER_COPY`:

```typescript
const NIGHT_BREAKDOWN = [
  { night: 1, title: 'Desligando o estado de alerta', completed: true },
  { night: 2, title: 'Soltando o controle da mente', completed: false },
  { night: 3, title: 'Desligamento profundo do corpo', completed: false },
  { night: 4, title: 'Quebrando o ciclo de pensamentos', completed: false },
  { night: 5, title: 'Entrando em segurança profunda', completed: false },
  { night: 6, title: 'Quando o sono começa sozinho', completed: false },
  { night: 7, title: 'Seu corpo já sabe dormir', completed: false },
];
```

- [ ] **Step 3: Replace the icon-row in the offer step with the night breakdown**

Find the existing icon row in the `offer` step (the `div` with `mb-5 flex justify-center gap-1.5` that renders a Check icon + 6 Lock icons, roughly lines 279–295). Replace it with:

```tsx
<div className="mb-5 space-y-1.5">
  {NIGHT_BREAKDOWN.map(({ night, title, completed }) => (
    <div
      key={night}
      className="flex items-center gap-3 px-3 py-2 rounded-xl"
      style={{
        background: completed ? 'rgba(52,211,153,0.07)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${completed ? 'rgba(52,211,153,0.18)' : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      <span className="text-[13px] select-none flex-shrink-0">
        {completed ? '✅' : '🔒'}
      </span>
      <span
        className="text-[12px] font-medium"
        style={{ color: completed ? 'rgba(52,211,153,0.85)' : 'rgba(255,255,255,0.45)' }}
      >
        Noite {night} — {title}
      </span>
    </div>
  ))}
</div>
```

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/sono/SonoPostExperienceModal.tsx
git commit -m "feat: update sleep offer modal copy and replace icon row with night breakdown"
```

---

## Task 3: Create SleepProtocolOfferCard

**Files:**
- Create: `src/components/sono/SleepProtocolOfferCard.tsx`
- Create: `src/components/sono/__tests__/SleepProtocolOfferCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/sono/__tests__/SleepProtocolOfferCard.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SleepProtocolOfferCard } from '../SleepProtocolOfferCard';

describe('SleepProtocolOfferCard', () => {
  it('renders headline and price', () => {
    render(
      <SleepProtocolOfferCard
        onStart={vi.fn()}
        onCheckout={vi.fn()}
      />
    );
    expect(screen.getByText(/Experimente a primeira noite/i)).toBeInTheDocument();
    expect(screen.getByText(/R\$97/)).toBeInTheDocument();
  });

  it('calls onStart when primary CTA is clicked', () => {
    const onStart = vi.fn();
    render(
      <SleepProtocolOfferCard
        onStart={onStart}
        onCheckout={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText(/Começar experiência gratuita/i));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('calls onCheckout when secondary CTA is clicked', () => {
    const onCheckout = vi.fn();
    render(
      <SleepProtocolOfferCard
        onStart={vi.fn()}
        onCheckout={onCheckout}
      />
    );
    fireEvent.click(screen.getByText(/Liberar protocolo completo/i));
    expect(onCheckout).toHaveBeenCalledOnce();
  });

  it('disables checkout button and shows loading state', () => {
    render(
      <SleepProtocolOfferCard
        onStart={vi.fn()}
        onCheckout={vi.fn()}
        checkoutLoading={true}
      />
    );
    expect(screen.getByText(/Abrindo/i)).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /Abrindo/i });
    expect(btn).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- SleepProtocolOfferCard
```

Expected: FAIL — `SleepProtocolOfferCard` not found.

- [ ] **Step 3: Create the component**

Create `src/components/sono/SleepProtocolOfferCard.tsx`:

```tsx
import { Play, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const T = {
  amber:      '#C9922A',
  amberLight: '#D4A847',
  amberGlow:  'rgba(212,168,71,',
};

interface SleepProtocolOfferCardProps {
  onStart: () => void;
  onCheckout: () => void;
  checkoutLoading?: boolean;
}

export function SleepProtocolOfferCard({
  onStart,
  onCheckout,
  checkoutLoading = false,
}: SleepProtocolOfferCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ type: 'spring', stiffness: 65, damping: 18 }}
      className="relative overflow-hidden rounded-3xl px-6 py-7 text-center"
      style={{
        background: 'linear-gradient(160deg, rgba(14,12,9,0.97) 0%, rgba(8,8,11,0.99) 100%)',
        border: `1px solid ${T.amberGlow}0.18)`,
        boxShadow: `0 8px 40px rgba(0,0,0,0.30), inset 0 1px 0 ${T.amberGlow}0.06)`,
      }}
    >
      {/* Warm glow top-right */}
      <div
        className="pointer-events-none absolute"
        style={{
          top: '-50px', right: '-40px',
          width: '180px', height: '180px', borderRadius: '50%',
          background: `radial-gradient(circle, ${T.amberGlow}0.08) 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10">
        <p
          className="text-[11px] uppercase tracking-[0.2em] font-bold mb-3"
          style={{ color: 'rgba(251,191,36,0.75)' }}
        >
          Protocolo Sono Profundo — 7 noites guiadas
        </p>

        <h3
          className="font-display text-[20px] font-bold text-white mb-3 leading-tight"
        >
          Experimente a primeira noite gratuitamente.
        </h3>

        <p
          className="text-[13px] leading-relaxed mb-5"
          style={{ color: 'rgba(255,255,255,0.46)' }}
        >
          Em 8 minutos, você vai conduzir seu corpo para fora do estado de alerta e iniciar um ritual de desaceleração profunda. Ao final da experiência, você poderá liberar o protocolo completo de 7 noites.
        </p>

        <div className="flex items-baseline justify-center gap-3 mb-1">
          <span className="font-display text-[38px] font-bold text-white leading-none">R$97</span>
        </div>
        <p className="text-[12px] mb-5" style={{ color: 'rgba(255,255,255,0.28)' }}>
          7 noites completas · Pagamento único
        </p>

        <button
          onClick={onStart}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-[15px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98] mb-3"
          style={{
            background: `linear-gradient(135deg, ${T.amberLight} 0%, ${T.amber} 100%)`,
            color: '#0D1120',
            boxShadow: `0 10px 32px ${T.amberGlow}0.32)`,
          }}
        >
          <Play className="h-4 w-4" fill="currentColor" />
          Começar experiência gratuita →
        </button>

        <button
          onClick={onCheckout}
          disabled={checkoutLoading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[14px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 mb-3"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.13)',
            color: 'rgba(255,255,255,0.70)',
          }}
        >
          {checkoutLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Abrindo...
            </>
          ) : (
            'Liberar protocolo completo'
          )}
        </button>

        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.24)' }}>
          Pagamento seguro via Pix/cartão.
        </p>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- SleepProtocolOfferCard
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/sono/SleepProtocolOfferCard.tsx src/components/sono/__tests__/SleepProtocolOfferCard.test.tsx
git commit -m "feat: add SleepProtocolOfferCard inline offer component"
```

---

## Task 4: Verify all tasks compile together + full test suite

At this point Tasks 1–3 are complete. `SleepMeditationExperience` references `SleepProtocolOfferCard`, and the component now exists. This task runs the final checks.

- [ ] **Step 1: Run full lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 2: Run full test suite**

```bash
npm run test
```

Expected: all previously-passing tests still pass; 4 new `SleepProtocolOfferCard` tests pass. Any pre-existing failures should be the same set as before — do not accept new failures.

- [ ] **Step 3: Spot-check in browser**

```bash
npm run dev
```

Open `http://localhost:5173/sono/experiencia` in the browser.

Check:
- [ ] Page scrolls past the Nights 2–7 grid to reveal the offer card
- [ ] "Começar experiência gratuita →" button starts the player
- [ ] Player plays; at 95% audio completion (or audio end) the main page returns with the `SonoPostExperienceModal` open on top
- [ ] Modal shows quiz step → answer → offer step with new copy and night breakdown
- [ ] "Liberar protocolo completo por R$97" button triggers checkout
- [ ] Logged-in paid user at `/app/meditacoes-sono` sees no offer card

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: sleep guest offer — fix modal trigger, update copy, add landing page offer card"
```
