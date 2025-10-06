import { differenceInDays } from 'date-fns';

export const gerarMensagemRetorno = (mem: any): string | null => {
  if (!mem) return null;
  const dias = differenceInDays(new Date(), new Date(mem.created_at));
  if (dias === 0) return null;
  const resumo = mem.resumo_eco || 'algo que foi sentido';
  return `O usuário retorna após ${dias} dias. Na última interação significativa, compartilhou: “${resumo}”. Use isso para acolher o reencontro com sensibilidade.`;
};
