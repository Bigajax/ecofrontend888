/**
 * Utilities para gerar e compartilhar links diretos de programas
 */

interface ShareLinkConfig {
  programId: string;
  programTitle: string;
  route: string;
  description?: string;
  hashtags?: string[];
}

/**
 * Configuração do programa "Quem Pensa Enriquece"
 */
export const QUEM_PENSA_ENRIQUECE_SHARE: ShareLinkConfig = {
  programId: 'rec_2',
  programTitle: 'Quem Pensa Enriquece',
  route: '/app/riqueza-mental',
  description: 'Transforme seu mindset financeiro em 6 passos',
  hashtags: ['MindsetFinanceiro', 'QuemPensaEnriquece', 'Transformação'],
};

/**
 * Gera URL completa do programa baseado no ambiente
 */
export function getProgramUrl(config: ShareLinkConfig): string {
  const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  return `${baseUrl}${config.route}`;
}

/**
 * Gera link de compartilhamento para WhatsApp
 */
export function getWhatsAppShareLink(config: ShareLinkConfig): string {
  const url = getProgramUrl(config);
  const text = `🧠 ${config.programTitle}\n${config.description}\n\nAcesse gratuitamente:`;
  return `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
}

/**
 * Gera link de compartilhamento para Twitter/X
 */
export function getTwitterShareLink(config: ShareLinkConfig): string {
  const url = getProgramUrl(config);
  const text = `🧠 ${config.programTitle}\n${config.description}`;
  const hashtags = config.hashtags?.join(',') || '';
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=${hashtags}`;
}

/**
 * Gera link de compartilhamento para Facebook
 */
export function getFacebookShareLink(config: ShareLinkConfig): string {
  const url = getProgramUrl(config);
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

/**
 * Gera link de compartilhamento para LinkedIn
 */
export function getLinkedInShareLink(config: ShareLinkConfig): string {
  const url = getProgramUrl(config);
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}

/**
 * Gera link de compartilhamento para Email
 */
export function getEmailShareLink(config: ShareLinkConfig): string {
  const url = getProgramUrl(config);
  const subject = `Programa: ${config.programTitle}`;
  const body = `Olá!\n\nQueria compartilhar este programa incrível:\n\n🧠 ${config.programTitle}\n${config.description}\n\nAcesse gratuitamente:\n${url}`;
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Copia o link para a área de transferência
 */
export async function copyToClipboard(config: ShareLinkConfig): Promise<boolean> {
  const url = getProgramUrl(config);

  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch (error) {
    // Fallback para navegadores antigos
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  }
}

/**
 * Compartilha usando Web Share API (mobile)
 */
export async function shareNative(config: ShareLinkConfig): Promise<boolean> {
  if (!navigator.share) {
    return false;
  }

  try {
    await navigator.share({
      title: config.programTitle,
      text: config.description,
      url: getProgramUrl(config),
    });
    return true;
  } catch (error) {
    // Usuário cancelou ou erro
    return false;
  }
}

/**
 * Verifica se o dispositivo suporta Web Share API
 */
export function canShareNative(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator;
}

/**
 * Helper para abrir link de compartilhamento em nova janela
 */
export function openShareWindow(url: string, width = 600, height = 400): void {
  const left = (window.innerWidth - width) / 2;
  const top = (window.innerHeight - height) / 2;

  window.open(
    url,
    'share',
    `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
  );
}

/**
 * Exemplo de uso:
 *
 * import {
 *   QUEM_PENSA_ENRIQUECE_SHARE,
 *   getWhatsAppShareLink,
 *   copyToClipboard
 * } from '@/utils/shareLinks';
 *
 * // Compartilhar no WhatsApp
 * const whatsappLink = getWhatsAppShareLink(QUEM_PENSA_ENRIQUECE_SHARE);
 * window.open(whatsappLink, '_blank');
 *
 * // Copiar link
 * const copied = await copyToClipboard(QUEM_PENSA_ENRIQUECE_SHARE);
 * if (copied) toast.success('Link copiado!');
 */
