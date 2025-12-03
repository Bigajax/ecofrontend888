/**
 * Video URLs Configuration
 *
 * This module centralizes all video URLs for the application.
 * Videos are hosted on Vercel Blob Storage for optimal performance and CDN delivery.
 *
 * SECURITY NOTE:
 * - These are PUBLIC URLs from Vercel Blob Storage
 * - NEVER include the ECOTOPIA_VIDEOS_READ_WRITE_TOKEN in frontend code
 * - The read/write token is for SERVER-SIDE uploads only
 * - Public URLs are safe to use in the browser and can be committed to git
 */

/**
 * Caleidoscópio de Dinheiro video
 * Used in: ManifestacaoDinheiroPage.tsx (Step 3 - Caleidoscópio section)
 * Duration: ~7 minutes
 * Purpose: Visual meditation for abundance mindset
 */
export const VIDEO_CALEIDOSCOPIO_DINHEIRO =
  import.meta.env.VITE_VIDEO_CALEIDOSCOPIO_DINHEIRO ||
  'https://e6qcazsomcrmqybj.public.blob.vercel-storage.com/caleidoscopio-dinheiro.mp4';

/**
 * Helper to check if video URLs are properly configured
 */
export const isVideoConfigured = (videoUrl: string): boolean => {
  return videoUrl.length > 0 && videoUrl.startsWith('https://');
};

/**
 * Development helper to log video configuration status
 */
if (import.meta.env.DEV) {
  console.log('[ECO Videos] Configuration loaded:', {
    caleidoscopioDinheiro: VIDEO_CALEIDOSCOPIO_DINHEIRO,
    isConfigured: isVideoConfigured(VIDEO_CALEIDOSCOPIO_DINHEIRO),
  });
}
