/**
 * FeedbackModal Component
 *
 * Modal for collecting user feedback (suggestions, bugs, improvements).
 * Inspired by Supabase's feedback modal but in Portuguese with a light theme.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Image as ImageIcon } from 'lucide-react';
import { submitUserFeedback } from '@/api/userFeedback';
import type { FeedbackFormData } from '@/types/feedback';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<FeedbackFormData['category']>('other');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      setError('Por favor, escreva sua mensagem.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const feedbackData: FeedbackFormData = {
        message: message.trim(),
        category,
        page: window.location.pathname,
      };

      await submitUserFeedback(feedbackData);

      setSubmitSuccess(true);
      setMessage('');

      // Auto-close after 2 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setMessage('');
      setCategory('other');
      setError(null);
      setSubmitSuccess(false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Feedback</h2>
                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                  aria-label="Fechar"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Success Message */}
              {submitSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mx-6 mt-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3"
                >
                  <p className="text-sm font-medium text-green-800">
                    ✓ Feedback enviado com sucesso!
                  </p>
                </motion.div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6">
                {/* Category Selector */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Tipo de feedback
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'bug', label: '🐛 Bug' },
                      { value: 'feature', label: '✨ Sugestão' },
                      { value: 'improvement', label: '⚡ Melhoria' },
                      { value: 'other', label: '💬 Outro' },
                    ].map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setCategory(cat.value as FeedbackFormData['category'])}
                        className={`
                          rounded-lg border px-3 py-2 text-sm font-medium transition-all
                          ${
                            category === cat.value
                              ? 'border-eco-baby bg-eco-baby/10 text-eco-baby'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Input */}
                <div className="mb-4">
                  <label htmlFor="feedback-message" className="mb-2 block text-sm font-medium text-gray-700">
                    Sua mensagem
                  </label>
                  <textarea
                    id="feedback-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={isSubmitting || submitSuccess}
                    placeholder="Descreva sua sugestão, bug ou comentário..."
                    rows={4}
                    className="
                      w-full rounded-lg border border-gray-300 bg-white px-4 py-3
                      text-sm text-gray-900 placeholder-gray-400
                      transition-colors
                      focus:border-eco-baby focus:outline-none focus:ring-2 focus:ring-eco-baby/20
                      disabled:bg-gray-50 disabled:text-gray-500
                    "
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3"
                  >
                    <p className="text-sm text-red-800">{error}</p>
                  </motion.div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between">
                  {/* Attachment button (placeholder) */}
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 opacity-50 cursor-not-allowed"
                    title="Em breve"
                  >
                    <ImageIcon size={16} />
                  </button>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={isSubmitting || submitSuccess || !message.trim()}
                    className="
                      inline-flex items-center gap-2 rounded-lg bg-eco-baby px-5 py-2.5
                      text-sm font-semibold text-white
                      transition-all
                      hover:bg-eco-baby/90
                      disabled:cursor-not-allowed disabled:opacity-50
                    "
                  >
                    {isSubmitting ? (
                      <>
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Enviar
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FeedbackModal;
