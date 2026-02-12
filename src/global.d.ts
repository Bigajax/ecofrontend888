// Global type declarations for Ecotopia frontend

declare global {
  interface Window {
    /**
     * Flag setada quando React monta com sucesso
     * Usada pelo fallback do index.html para detectar que a app carregou
     */
    __APP_MOUNTED__?: boolean;
  }
}

export {};
