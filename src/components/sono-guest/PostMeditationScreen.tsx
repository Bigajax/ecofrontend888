import { useEffect, useState } from 'react';
import { submitGuestLead } from '@/api/guestLead';
import {
  trackGuestCaptureShown,
  trackGuestCaptureWhatsapp,
  trackGuestCaptureEmail,
  trackGuestCaptureSkipped,
} from '@/lib/mixpanelSonoGuestEvents';

interface PostMeditationScreenProps {
  onGoToProtocol: (capturedLead: boolean) => void;
}

const TIME_OPTIONS = ['22:00', '22:30', '23:00', '23:30'];

export function PostMeditationScreen({ onGoToProtocol }: PostMeditationScreenProps) {
  const [showBlock1, setShowBlock1] = useState(false);
  const [showBlock2, setShowBlock2] = useState(false);
  const [tab, setTab] = useState<'whatsapp' | 'email'>('whatsapp');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    trackGuestCaptureShown();
    const t1 = setTimeout(() => setShowBlock1(true), 200);
    const t2 = setTimeout(() => setShowBlock2(true), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const handleSubmit = async () => {
    const trimmed = contact.trim();
    if (!trimmed) {
      setError('Por favor, preencha o campo.');
      return;
    }
    if (tab === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Email inválido.');
      return;
    }
    setError(null);
    setSubmitting(true);

    if (tab === 'whatsapp') trackGuestCaptureWhatsapp();
    else trackGuestCaptureEmail();

    await submitGuestLead({
      contact: trimmed,
      type: tab,
      source: 'noite1_post_meditation',
    });

    setSubmitting(false);
    setSubmitted(true);

    // Show time picker inline after brief confirmation
    setTimeout(() => setShowTimePicker(true), 800);
  };

  const handleTimeSelected = async (time: string | null) => {
    const finalTime = time ?? '22:30';
    // Update stored lead with preferredTime
    await submitGuestLead({
      contact: contact.trim(),
      type: tab,
      preferredTime: finalTime,
      source: 'noite1_post_meditation',
    });
    setTimeout(() => onGoToProtocol(true), 800);
  };

  const handleSkip = () => {
    trackGuestCaptureSkipped();
    onGoToProtocol(false);
  };

  return (
    <div
      className="flex min-h-screen w-full flex-col items-center justify-center px-6 py-10"
      style={{ background: '#0C0A1D' }}
    >
      <style>{`
        @keyframes check-draw {
          from { stroke-dashoffset: 60; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes circle-draw {
          from { stroke-dashoffset: 160; }
          to   { stroke-dashoffset: 0; }
        }
        .draw-circle { animation: circle-draw 0.5s ease-out 0.1s forwards; }
        .draw-check  { animation: check-draw 0.4s ease-out 0.5s forwards; }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fade-up 0.8s ease-out forwards; }
      `}</style>

      <div className="flex w-full max-w-sm flex-col gap-8">
        {/* Block 1: Completion */}
        <div
          className={showBlock1 ? 'fade-up flex flex-col items-center gap-4 text-center' : 'opacity-0 flex flex-col items-center gap-4 text-center'}
        >
          {/* SVG check */}
          <svg width="64" height="64" viewBox="0 0 52 52">
            <circle
              cx="26" cy="26" r="24"
              fill="none"
              stroke="#4CAF7D"
              strokeWidth="2"
              strokeDasharray="160"
              strokeDashoffset="160"
              className="draw-circle"
            />
            <path
              d="M14 27l8 8 16-16"
              fill="none"
              stroke="#4CAF7D"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="60"
              strokeDashoffset="60"
              className="draw-check"
            />
          </svg>

          <h2 className="text-2xl font-semibold" style={{ color: '#F5F0E8' }}>
            Noite 1 concluída.
          </h2>
          <p className="text-sm" style={{ color: 'rgba(245,240,232,0.55)' }}>
            Seu sistema nervoso registrou o primeiro sinal.
          </p>

          {/* 1/7 progress */}
          <div className="w-full">
            <div className="mb-1 flex justify-between text-xs" style={{ color: 'rgba(245,240,232,0.4)' }}>
              <span>Protocolo Sono Profundo</span>
              <span>1 de 7 noites</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: '14.3%', background: '#4CAF7D' }}
              />
            </div>
          </div>
        </div>

        {/* Block 2: Capture */}
        {!showTimePicker ? (
          <div
            className={showBlock2 ? 'fade-up flex flex-col gap-4' : 'opacity-0 flex flex-col gap-4'}
          >
            <div
              className="flex flex-col gap-4 rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div className="text-center">
                <p className="font-medium" style={{ color: '#F5F0E8' }}>
                  Continue amanhã de onde parou.
                </p>
                <p className="mt-1 text-sm" style={{ color: 'rgba(245,240,232,0.55)' }}>
                  Deixe seu contato e te avisamos na hora da Noite 2.
                </p>
              </div>

              {/* Tabs */}
              <div
                className="flex rounded-xl p-0.5"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                {(['whatsapp', 'email'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); setContact(''); setError(null); }}
                    className="flex-1 rounded-lg py-2 text-sm font-medium transition-all"
                    style={{
                      background: tab === t ? 'rgba(255,255,255,0.12)' : 'transparent',
                      color: tab === t ? '#F5F0E8' : 'rgba(245,240,232,0.45)',
                    }}
                  >
                    {t === 'whatsapp' ? '📱 WhatsApp' : '✉️ Email'}
                  </button>
                ))}
              </div>

              {/* Input */}
              {submitted ? (
                <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: 'rgba(76,175,125,0.15)', border: '1px solid rgba(76,175,125,0.3)' }}>
                  <span style={{ color: '#4CAF7D' }}>✓</span>
                  <span className="text-sm" style={{ color: '#4CAF7D' }}>
                    Pronto! Você vai receber o lembrete amanhã.
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <input
                      type={tab === 'email' ? 'email' : 'tel'}
                      inputMode={tab === 'email' ? 'email' : 'tel'}
                      placeholder={tab === 'whatsapp' ? '(11) 99999-9999' : 'seu@email.com'}
                      value={contact}
                      onChange={(e) => { setContact(e.target.value); setError(null); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.07)',
                        border: error ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.12)',
                        color: '#F5F0E8',
                      }}
                    />
                    {error && <p className="text-xs text-red-400">{error}</p>}
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full rounded-xl py-3 text-sm font-semibold transition-opacity"
                    style={{
                      background: tab === 'whatsapp' ? '#25D366' : '#7C6EF6',
                      color: '#fff',
                      opacity: submitting ? 0.7 : 1,
                    }}
                  >
                    {submitting ? 'Enviando...' : tab === 'whatsapp' ? 'Receber lembrete pelo WhatsApp →' : 'Receber lembrete por email →'}
                  </button>
                </>
              )}

              <p className="text-center text-xs" style={{ color: 'rgba(245,240,232,0.3)' }}>
                Só lembretes do protocolo. Sem spam. Cancele quando quiser.
              </p>
            </div>

            {/* Skip */}
            <button
              onClick={handleSkip}
              className="text-center text-sm transition-opacity hover:opacity-70"
              style={{ color: 'rgba(245,240,232,0.35)' }}
            >
              Pular por agora
            </button>
          </div>
        ) : (
          /* Time Picker (inline, appears after capture) */
          <div className="fade-up flex flex-col items-center gap-4 text-center">
            <p className="font-medium" style={{ color: '#F5F0E8' }}>
              A que horas você costuma deitar?
            </p>
            <p className="text-sm" style={{ color: 'rgba(245,240,232,0.5)' }}>
              Vamos te lembrar 10 minutos antes.
            </p>
            <div className="grid grid-cols-4 gap-2 w-full">
              {TIME_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => handleTimeSelected(t)}
                  className="rounded-xl py-3 text-sm font-medium transition-all"
                  style={{
                    background: 'rgba(124,110,246,0.15)',
                    border: '1px solid rgba(124,110,246,0.3)',
                    color: '#C4BBFF',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <button
              onClick={() => handleTimeSelected(null)}
              className="text-sm transition-opacity hover:opacity-70"
              style={{ color: 'rgba(245,240,232,0.35)' }}
            >
              Pular
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
