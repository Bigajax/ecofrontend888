import { RefObject, useEffect, useRef } from 'react';

interface UseMediaSessionOptions {
  title: string;
  artist?: string;
  artwork?: string;
  audioRef: RefObject<HTMLAudioElement>;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  onPlay: () => void;
  onPause: () => void;
  onSeekBackward?: () => void;
  onSeekForward?: () => void;
  onSeekTo?: (time: number) => void;
}

/**
 * Integrates the Web MediaSession API so the OS shows media controls on the
 * lock screen and responds to hardware buttons (headset, car, etc.).
 *
 * Callbacks are stored in refs so the action handlers never become stale and
 * don't need to be re-registered on every render.
 */
export function useMediaSession({
  title,
  artist = 'ECO',
  artwork,
  audioRef,
  isPlaying,
  duration,
  currentTime,
  onPlay,
  onPause,
  onSeekBackward,
  onSeekForward,
  onSeekTo,
}: UseMediaSessionOptions): void {
  // Keep latest callbacks in refs — handlers reference these so they're always fresh
  const onPlayRef = useRef(onPlay);
  const onPauseRef = useRef(onPause);
  const onSeekBackwardRef = useRef(onSeekBackward);
  const onSeekForwardRef = useRef(onSeekForward);
  const onSeekToRef = useRef(onSeekTo);

  // Sync refs every render (synchronous assignment, before any effect fires)
  onPlayRef.current = onPlay;
  onPauseRef.current = onPause;
  onSeekBackwardRef.current = onSeekBackward;
  onSeekForwardRef.current = onSeekForward;
  onSeekToRef.current = onSeekTo;

  // Update metadata whenever title / artist / artwork change
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const artworkList: MediaImage[] = [];
    if (artwork) {
      // Only attach real URLs — not CSS gradients
      const isUrl =
        artwork.startsWith('/') ||
        artwork.startsWith('http') ||
        artwork.startsWith('blob:');
      if (isUrl) {
        const src =
          artwork.startsWith('http') || artwork.startsWith('blob:')
            ? artwork
            : `${window.location.origin}${artwork}`;
        artworkList.push({ src, sizes: '512x512', type: 'image/webp' });
      }
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      artwork: artworkList,
    });
  }, [title, artist, artwork]);

  // Register action handlers once; refs ensure latest callbacks are always used
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play', () =>
      onPlayRef.current()
    );
    navigator.mediaSession.setActionHandler('pause', () =>
      onPauseRef.current()
    );
    navigator.mediaSession.setActionHandler('seekbackward', () => {
      if (onSeekBackwardRef.current) {
        onSeekBackwardRef.current();
      } else if (audioRef.current) {
        audioRef.current.currentTime = Math.max(
          0,
          audioRef.current.currentTime - 10
        );
      }
    });
    navigator.mediaSession.setActionHandler('seekforward', () => {
      if (onSeekForwardRef.current) {
        onSeekForwardRef.current();
      } else if (audioRef.current) {
        audioRef.current.currentTime = Math.min(
          audioRef.current.duration || 0,
          audioRef.current.currentTime + 10
        );
      }
    });
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) {
        if (onSeekToRef.current) {
          onSeekToRef.current(details.seekTime);
        } else if (audioRef.current) {
          audioRef.current.currentTime = details.seekTime;
        }
      }
    });

    return () => {
      if (!('mediaSession' in navigator)) return;
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
      navigator.mediaSession.setActionHandler('seekto', null);
    };
  }, [audioRef]); // audioRef is a stable ref object; callbacks accessed via refs above

  // Keep playback state in sync with isPlaying
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  // Keep the lock-screen scrubber position accurate
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (!duration || !isFinite(duration) || duration <= 0) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: 1,
        position: Math.min(Math.max(0, currentTime), duration),
      });
    } catch {
      // setPositionState not supported on all browsers — silently ignore
    }
  }, [currentTime, duration]);
}
