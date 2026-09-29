// src/components/subscription/UpgradeModal.tsx
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FolhaDaPorta } from '@/components/reino/PortaDoReino';
import { trackPremiumScreenViewed } from '@/lib/mixpanelConversionEvents';
import { useAuth } from '@/contexts/AuthContext';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  source?: string;
}

/**
 * O pedido de assinatura das telas que ainda controlam o próprio modal (set/2026):
 * mostra a mesma folha da Porta do reino, com o caminho da pessoa até aqui.
 * Antes: painel azul em gradiente, cards de vidro, dois planos e depoimentos
 * que não eram de clientes reais. A escolha de plano ficou no /assinar.
 */
export default function UpgradeModal({ open, onClose, source = 'generic' }: UpgradeModalProps) {
  const { user } = useAuth();

  useEffect(() => {
    if (!open) return;
    trackPremiumScreenViewed({
      plan_id: 'monthly',
      plan_label: 'Premium Mensal',
      price: 15.9,
      screen: 'upgrade_modal',
      placement: source,
      is_guest: !user,
      user_id: user?.id,
    });
  }, [open, source, user]);

  if (!open || typeof document === 'undefined') return null;
  return createPortal(<FolhaDaPorta origem={source} onFechar={onClose} />, document.body);
}
