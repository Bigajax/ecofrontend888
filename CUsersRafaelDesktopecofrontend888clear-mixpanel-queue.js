// Script para limpar fila antiga do Mixpanel
// Execute no console do navegador (F12) se ainda tiver erros de mutex

console.log('[Mixpanel] Limpando fila antiga...');

// Limpar todas as chaves do Mixpanel
Object.keys(localStorage).forEach(key => {
  if (key.includes('__mpq_') || key.includes('mp_')) {
    console.log('[Mixpanel] Removendo:', key);
    localStorage.removeItem(key);
  }
});

console.log('[Mixpanel] Fila limpa! Recarregue a página.');
