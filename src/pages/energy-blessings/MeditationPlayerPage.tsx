import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Play, Pause, RotateCcw, RotateCw, Heart, Volume2, Music } from 'lucide-react';

interface MeditationData {
  title: string;
  duration: string;
  audioUrl: string;
  imageUrl: string;
  backgroundMusic?: string;
}

export default function MeditationPlayerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const audioRef = useRef<HTMLAudioElement>(null);

  // Dados da meditação passados via navigation state
  const meditationData: MeditationData = location.state?.meditation || {
    title: 'Bênçãos dos Centros de Energia',
    duration: '07:42',
    audioUrl: '/audio/energy-blessings-meditation.mp3',
    imageUrl: '/images/energy-blessings.png',
    backgroundMusic: 'Cristais'
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(20);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', () => setIsPlaying(false));
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSkip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds;
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-blue-50 to-purple-100 font-primary">
      {/* Back Button */}
      <button
        onClick={handleBack}
        className="absolute top-8 left-8 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md hover:shadow-lg transition-all hover:scale-105"
      >
        <ChevronLeft size={24} className="text-gray-700" />
      </button>

      {/* Main Content */}
      <div className="flex min-h-screen flex-col items-center justify-center px-8 py-20">
        {/* Meditation Image */}
        <div className="mb-8 overflow-hidden rounded-3xl shadow-2xl">
          <img
            src={meditationData.imageUrl}
            alt={meditationData.title}
            className="h-64 w-64 object-cover"
          />
        </div>

        {/* Title */}
        <h1 className="mb-12 text-3xl font-bold text-gray-800">
          {meditationData.title}
        </h1>

        {/* Playback Controls */}
        <div className="mb-16 flex items-center gap-6">
          {/* Skip Back 15s */}
          <button
            onClick={() => handleSkip(-15)}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-md hover:shadow-lg transition-all hover:scale-105"
          >
            <RotateCcw size={20} className="text-gray-700" />
            <span className="absolute text-xs font-medium text-gray-700" style={{ marginTop: '2px' }}>
              15
            </span>
          </button>

          {/* Play/Pause Button */}
          <button
            onClick={handlePlayPause}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-300 shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            {isPlaying ? (
              <Pause size={32} className="text-gray-800 fill-gray-800" />
            ) : (
              <Play size={32} className="text-gray-800 fill-gray-800 ml-1" />
            )}
          </button>

          {/* Skip Forward 15s */}
          <button
            onClick={() => handleSkip(15)}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-md hover:shadow-lg transition-all hover:scale-105"
          >
            <RotateCw size={20} className="text-gray-700" />
            <span className="absolute text-xs font-medium text-gray-700" style={{ marginTop: '2px' }}>
              15
            </span>
          </button>
        </div>

        {/* Bottom Controls */}
        <div className="w-full max-w-4xl">
          <div className="flex items-center gap-6 rounded-full bg-white/80 backdrop-blur-sm px-6 py-4 shadow-lg">
            {/* Background Music Info */}
            <div className="flex items-center gap-3 rounded-full bg-gray-100 px-4 py-2">
              <Music size={18} className="text-gray-600" />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500 uppercase">Sons de Fundo</span>
                <span className="text-sm font-medium text-gray-800">
                  {meditationData.backgroundMusic || 'Cristais'}
                </span>
              </div>
            </div>

            {/* Time Display */}
            <span className="text-sm font-medium text-gray-700">
              {formatTime(currentTime)}
            </span>

            {/* Progress Bar */}
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleProgressChange}
              className="flex-1 cursor-pointer"
              style={{
                background: `linear-gradient(to right, #9CA3AF 0%, #9CA3AF ${(currentTime / (duration || 1)) * 100}%, #E5E7EB ${(currentTime / (duration || 1)) * 100}%, #E5E7EB 100%)`
              }}
            />

            {/* Duration */}
            <span className="text-sm font-medium text-gray-700">
              {formatTime(duration)}
            </span>

            {/* Favorite Button */}
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <Heart
                size={20}
                className={isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}
              />
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-3">
              <Volume2 size={20} className="text-gray-600" />
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(parseInt(e.target.value))}
                className="w-24 cursor-pointer"
              />
              <span className="text-sm font-medium text-gray-700 w-10">
                %{volume}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Audio Element */}
      <audio ref={audioRef} src={meditationData.audioUrl} />
    </div>
  );
}
