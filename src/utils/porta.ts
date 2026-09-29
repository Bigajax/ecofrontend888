/**
 * Abre a Porta do reino (o pedido de assinatura com o caminho da pessoa).
 * O componente PortaDoReino fica montado no App e escuta este evento.
 */
export const EVENTO_PORTA = 'eco:porta';

export interface DetalhePorta {
  origem: string;
}

export function abrirPorta(origem: string): void {
  try {
    window.dispatchEvent(new CustomEvent<DetalhePorta>(EVENTO_PORTA, { detail: { origem } }));
  } catch {
    // ambiente sem window
  }
}
