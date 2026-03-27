import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getStoredLead } from '@/api/guestLead';
import { trackGuestPlayerOpened } from '@/lib/mixpanelSonoGuestEvents';
import { PlayerScreen } from '@/components/sono-guest/PlayerScreen';
import { PlaybackScreen } from '@/components/sono-guest/PlaybackScreen';
import { PostMeditationScreen } from '@/components/sono-guest/PostMeditationScreen';
import { ProtocolScreen } from '@/components/sono-guest/ProtocolScreen';
import { PurchaseModal } from '@/components/sono-guest/PurchaseModal';
import { SoundOption, LS_KEYS } from '@/components/sono-guest/types';

type Screen = 'player' | 'playback' | 'post_meditation' | 'protocol';

interface ProgressData {
  time: number;
  savedAt: number;
}

function getSavedProgress(): number | null {
  try {
    const raw = localStorage.getItem(LS_KEYS.progress);
    if (!raw) return null;
    const data = JSON.parse(raw) as ProgressData;
    // Expire after 7 days
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - data.savedAt > sevenDays) {
      localStorage.removeItem(LS_KEYS.progress);
      return null;
    }
    return data.time > 10 ? data.time : null;
  } catch {
    return null;
  }
}

function isNight1Completed(): boolean {
  return localStorage.getItem(LS_KEYS.completed) === 'true';
}

function markNight1Completed(): void {
  localStorage.setItem(LS_KEYS.completed, 'true');
  localStorage.removeItem(LS_KEYS.progress);
}

export default function GuestNight1Page() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [screen, setScreen] = useState<Screen>('player');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedSound, setSelectedSound] = useState<SoundOption>('rain');
  const [startTime, setStartTime] = useState(0);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [capturedEmail, setCapturedEmail] = useState<string | null>(null);
  const [resumeTime, setResumeTime] = useState<number | null>(null);

  // Authenticated users go to the full app
  useEffect(() => {
    if (user) {
      navigate('/app/meditacoes-sono', { replace: true });
      return;
    }
  }, [user, navigate]);

  // Initial state from localStorage
  useEffect(() => {
    if (isNight1Completed()) {
      setScreen('protocol');
      return;
    }
    const savedTime = getSavedProgress();
    setResumeTime(savedTime);

    const stored = getStoredLead();
    if (stored) {
      setLeadCaptured(true);
      if (stored.type === 'email') setCapturedEmail(stored.contact);
    }
  }, []);

  // Update meta tags for this page
  useEffect(() => {
    const prevTitle = document.title;
    const themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const prevThemeColor = themeColorMeta?.content ?? '';
    const ogTitleMeta = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    const prevOgTitle = ogTitleMeta?.content ?? '';

    document.title = 'Noite 1 Grátis — Protocolo Sono Profundo | Ecotopia';
    if (themeColorMeta) themeColorMeta.content = '#0C0A1D';
    if (ogTitleMeta) ogTitleMeta.content = 'Noite 1 Grátis — Protocolo Sono Profundo';

    trackGuestPlayerOpened();

    return () => {
      document.title = prevTitle;
      if (themeColorMeta) themeColorMeta.content = prevThemeColor;
      if (ogTitleMeta) ogTitleMeta.content = prevOgTitle;
    };
  }, []);

  const handlePlay = (sound: SoundOption, resumeFrom?: number) => {
    setSelectedSound(sound);
    setStartTime(resumeFrom ?? 0);
    setScreen('playback');
  };

  const handleAudioComplete = () => {
    markNight1Completed();
    // 1s delay already in PlaybackScreen; transition here with fade
    setScreen('post_meditation');
  };

  const handleGoToProtocol = (captured: boolean) => {
    if (captured) {
      setLeadCaptured(true);
      const stored = getStoredLead();
      if (stored?.type === 'email') setCapturedEmail(stored.contact);
    }
    setScreen('protocol');
  };

  const handleReplayNight1 = () => {
    setStartTime(0);
    setScreen('player');
  };

  // Don't render until we've checked auth
  if (user === undefined) return null;

  return (
    <>
      {screen === 'player' && (
        <PlayerScreen resumeTime={resumeTime} onPlay={handlePlay} />
      )}

      {screen === 'playback' && (
        <PlaybackScreen
          selectedSound={selectedSound}
          startTime={startTime}
          onComplete={handleAudioComplete}
        />
      )}

      {screen === 'post_meditation' && (
        <PostMeditationScreen onGoToProtocol={handleGoToProtocol} />
      )}

      {screen === 'protocol' && (
        <ProtocolScreen
          leadCaptured={leadCaptured}
          capturedEmail={capturedEmail}
          onOpenPurchase={() => setShowPurchaseModal(true)}
          onReplayNight1={handleReplayNight1}
        />
      )}

      {showPurchaseModal && (
        <PurchaseModal
          capturedEmail={capturedEmail}
          onClose={() => setShowPurchaseModal(false)}
        />
      )}
    </>
  );
}
