/**
 * ShareReflectionModal Component
 *
 * Modal for sharing daily reflections as images or text.
 * Supports download, copy, and native share API.
 */

import React, { useRef } from 'react';
import { Download, Copy, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { DailyMaxim } from '@/utils/diarioEstoico/getTodayMaxim';

interface ShareReflectionModalProps {
  maxim: DailyMaxim | null;
  open: boolean;
  onClose: () => void;
}

export default function ShareReflectionModal({
  maxim,
  open,
  onClose,
}: ShareReflectionModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDownloadImage = async () => {
    if (!cardRef.current || !maxim) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const scale = window.innerWidth < 768 ? 1 : 2;
      const canvas = await html2canvas(cardRef.current, {
        scale,
        backgroundColor: '#FAF9F7',
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `diario-estoico-${maxim.dayNumber}.png`;
      link.href = canvas.toDataURL();
      link.click();

      toast.success('Imagem baixada!');
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error('Erro ao baixar imagem');
    }
  };

  const handleCopyText = () => {
    if (!maxim) return;

    const text = `"${maxim.text}"\n\n— ${maxim.author}${maxim.source ? `, ${maxim.source}` : ''}`;

    navigator.clipboard.writeText(text)
      .then(() => {
        toast.success('Texto copiado!');
      })
      .catch((error) => {
        console.error('Error copying text:', error);
        toast.error('Erro ao copiar texto');
      });
  };

  const handleShare = async () => {
    if (!maxim) return;

    const text = `"${maxim.text}"\n\n— ${maxim.author}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: maxim.title,
          text: text,
          url: window.location.href,
        });
      } catch (error) {
        // User cancelled or error occurred
        console.log('Share cancelled or failed:', error);
      }
    } else {
      // Fallback: copy to clipboard
      handleCopyText();
    }
  };

  if (!open || !maxim) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/50
                 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 max-w-md w-full shadow-eco-glow
                   animate-slide-up-fade"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-display text-eco-text mb-4">
          Compartilhar Reflexão
        </h3>

        {/* Preview Card */}
        <div
          ref={cardRef}
          className="relative p-8 rounded-2xl mb-6 overflow-hidden"
          style={{
            backgroundImage: maxim.background || 'url("/images/meditacao-19-nov.webp")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-black/50 rounded-2xl" />

          <div className="relative space-y-4">
            <p className="font-display text-xl text-white italic leading-relaxed">
              "{maxim.text}"
            </p>
            <p className="text-sm text-white/80">
              — {maxim.author}
            </p>

            {/* Logo ECO */}
            <div className="flex items-center gap-2 mt-6">
              <div className="w-6 h-6 rounded-full bg-eco-accent/80" />
              <span className="text-xs text-white/60 font-medium">
                ECO - Diário Estoico
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={handleDownloadImage}
            className="flex flex-col items-center gap-2 p-3 rounded-xl
                       glass-shell hover:bg-eco-accent/10 transition-all
                       text-eco-text"
          >
            <Download size={20} />
            <span className="text-xs font-medium">Baixar</span>
          </button>

          <button
            onClick={handleCopyText}
            className="flex flex-col items-center gap-2 p-3 rounded-xl
                       glass-shell hover:bg-eco-accent/10 transition-all
                       text-eco-text"
          >
            <Copy size={20} />
            <span className="text-xs font-medium">Copiar</span>
          </button>

          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-2 p-3 rounded-xl
                       glass-shell hover:bg-eco-accent/10 transition-all
                       text-eco-text"
          >
            <Share2 size={20} />
            <span className="text-xs font-medium">
              {navigator.share ? 'Compartilhar' : 'Copiar'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
