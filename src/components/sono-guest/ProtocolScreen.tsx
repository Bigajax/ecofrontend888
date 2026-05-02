import { useEffect, useRef, useState } from 'react';
import { PROTOCOL_NIGHTS } from '@/data/protocolNights';
import { submitGuestLead } from '@/api/guestLead';
import {
  trackGuestProtocolViewed,
  trackGuestUnlockClicked,
  trackGuestNotificationOpted,
} from '@/lib/mixpanelSonoGuestEvents';

interface ProtocolScreenProps {
  leadCaptured: boolean;
  capturedEmail: string | null;
  onOpenPurchase: () => void;
  onReplayNight1: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const SOS_NIGHT = {
  id: 'sos',
  night: 8,
  title: 'SOS — Não Consigo Dormir Hoje',
  description: 'Para quando a insônia bate forte. Protocolo de emergência.',
  duration: '7 min',
  isFree: false,
};

export function ProtocolScreen({ leadCaptured, capturedEmail, onOpenPurchase, onReplayNight1 }: ProtocolScreenProps) {
  const [lockedModal, setLockedModal] = useState<string | null>(null);
  const [showCaptureBanner, setShowCaptureBanner] = useState(!leadCaptured);
  const [bannerContact, setBannerContact] = useState('');
  const [bannerSubmitted, setBannerSubmitted] = useState(false);
  const [notifAsked, setNotifAsked] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [showPwaCard, setShowPwaCard] = useState(false);

  useEffect(() => {
    trackGuestProtocolViewed();

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setShowPwaCard(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleLocked = (nightId: string, nightTitle: string) => {
    trackGuestUnlockClicked(nightId);
    setLockedModal(nightTitle);
  };

  const handleBannerSubmit = async () => {
    const trimmed = bannerContact.trim();
    if (!trimmed) return;
    await submitGuestLead({
      contact: trimmed,
      type: trimmed.includes('@') ? 'email' : 'whatsapp',
      source: 'noite1_post_meditation',
    });
    setBannerSubmitted(true);
    setTimeout(() => setShowCaptureBanner(false), 2000);
  };

  const handleNotification = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotifAsked(true);
    if (permission === 'granted') {
      trackGuestNotificationOpted();
    }
  };

  const handlePwaInstall = async () => {
    if (!deferredPromptRef.current) return;
    await deferredPromptRef.current.prompt();
    setShowPwaCard(false);
  };

  const allNights = [...PROTOCOL_NIGHTS, SOS_NIGHT as typeof PROTOCOL_NIGHTS[0]];

  return (
    <div className="min-h-screen w-full bg-[#FAF9F7] pb-24">
      {/* Capture banner (if no lead yet) */}
      {showCaptureBanner && (
        <div
          className="sticky top-0 z-10 flex items-center gap-3 border-b px-4 py-3"
          style={{ background: 'rgba(124,110,246,0.06)', borderColor: 'rgba(124,110,246,0.15)' }}
        >
          {bannerSubmitted ? (
            <p className="text-sm text-green-600">✓ Lembrete agendado!</p>
          ) : (
            <>
              <p className="flex-1 text-sm text-gray-600">
                📧 Quer lembrete pra Noite 2 amanhã?
              </p>
              <input
                type="text"
                placeholder="Email ou WhatsApp"
                value={bannerContact}
                onChange={(e) => setBannerContact(e.target.value)}
                className="w-36 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-violet-400"
              />
              <button
                onClick={handleBannerSubmit}
                className="rounded-lg px-3 py-1 text-xs font-medium text-white"
                style={{ background: '#7C6EF6' }}
              >
                OK
              </button>
              <button
                onClick={() => setShowCaptureBanner(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Fechar banner"
              >
                ✕
              </button>
            </>
          )}
        </div>
      )}

      <div className="mx-auto max-w-lg px-5 pt-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <img src="/images/ECOTOPIA.webp" alt="Ecotopia" className="h-7 w-auto" />
        </div>

        {/* Progress */}
        <div className="mb-6">
          <p className="mb-1 text-sm font-medium text-gray-700">Seu progresso no protocolo</p>
          <div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: '14.3%', background: '#4CAF7D' }}
            />
          </div>
          <p className="text-xs text-gray-400">1 de 7 noites concluídas</p>
        </div>

        {/* Upsell card */}
        <div
          className="mb-6 rounded-2xl p-5"
          style={{ background: 'linear-gradient(135deg, #1A1435 0%, #2D1B6B 100%)' }}
        >
          <p className="mb-1 font-semibold text-white">A Noite 1 preparou seu sistema nervoso.</p>
          <p className="mb-2 text-sm text-violet-200">
            A Noite 2 aprofunda o processo com respiração guiada.
          </p>
          <p className="mb-4 text-sm font-medium" style={{ color: '#FFC96F' }}>
            Cada noite que passa sem continuar, o cérebro volta pro padrão antigo.
          </p>
          <button
            onClick={() => { onOpenPurchase(); }}
            className="w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: '#7C6EF6' }}
          >
            Desbloquear as 7 noites — R$37 →
          </button>
        </div>

        {/* Night list */}
        <div className="mb-6 flex flex-col gap-2">
          {allNights.map((night) => {
            const isCompleted = night.night === 1;
            const isSos = night.id === 'sos';

            return (
              <div
                key={night.id}
                className="flex items-center gap-4 rounded-xl px-4 py-3"
                style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid #F0EDE8' }}
              >
                {/* Night number / status */}
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{
                    background: isCompleted ? '#4CAF7D' : isSos ? '#FFC96F22' : '#F3EEE7',
                    color: isCompleted ? '#fff' : isSos ? '#F59E0B' : '#9CA3AF',
                  }}
                >
                  {isCompleted ? '✓' : isSos ? '🎁' : `${night.night}`}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-tight ${isCompleted ? 'text-gray-800' : 'text-gray-400'}`}>
                    {night.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{night.duration}</p>
                </div>

                {/* Action */}
                {isCompleted ? (
                  <button
                    onClick={onReplayNight1}
                    className="shrink-0 rounded-lg px-3 py-1 text-xs font-medium"
                    style={{ background: 'rgba(76,175,125,0.1)', color: '#4CAF7D' }}
                  >
                    Ouvir novamente
                  </button>
                ) : (
                  <button
                    onClick={() => handleLocked(night.id, night.title)}
                    className="shrink-0 rounded-lg px-3 py-1 text-xs font-medium"
                    style={{ background: 'rgba(124,110,246,0.08)', color: '#7C6EF6' }}
                  >
                    🔒 Desbloquear
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Notification banner */}
        {!notifAsked && 'Notification' in window && Notification.permission === 'default' && (
          <div
            className="mb-4 flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: 'rgba(124,110,246,0.06)', border: '1px solid rgba(124,110,246,0.15)' }}
          >
            <p className="flex-1 text-sm text-gray-600">
              🔔 Quer que a gente te avise amanhã na hora de dormir?
            </p>
            <button
              onClick={handleNotification}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-white"
              style={{ background: '#7C6EF6' }}
            >
              Ativar lembrete
            </button>
          </div>
        )}

        {/* PWA install */}
        {showPwaCard && (
          <div
            className="mb-4 flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: '#F5F0E8', border: '1px solid #E8E0D5' }}
          >
            <p className="flex-1 text-sm text-gray-600">
              📱 Adicione à sua tela inicial pra acessar mais fácil.
            </p>
            <button
              onClick={handlePwaInstall}
              className="rounded-lg px-3 py-2 text-xs font-semibold"
              style={{ background: '#7C6EF6', color: '#fff' }}
            >
              Adicionar
            </button>
          </div>
        )}

        {/* Email hint below list */}
        {capturedEmail && (
          <p className="text-center text-xs text-gray-400">
            Lembrete será enviado para {capturedEmail}
          </p>
        )}
      </div>

      {/* Mini locked-night modal */}
      {lockedModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 md:items-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setLockedModal(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-1 font-semibold text-gray-800">{lockedModal}</p>
            <p className="mb-4 text-sm text-gray-500">
              Essa noite faz parte do protocolo completo. Desbloqueie todas as 7 noites + bônus por R$37.
            </p>
            <button
              onClick={() => { setLockedModal(null); onOpenPurchase(); }}
              className="w-full rounded-xl py-3 text-sm font-bold text-white"
              style={{ background: '#7C6EF6' }}
            >
              Desbloquear agora — R$37
            </button>
            <button
              onClick={() => setLockedModal(null)}
              className="mt-3 w-full text-sm text-gray-400 hover:text-gray-600"
            >
              Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
