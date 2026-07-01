// Detecta navegadores embarcados (in-app browsers) — sobretudo Instagram e
// Facebook, que dominam o tráfego pago. Neles o Google bloqueia o OAuth
// (`disallowed_useragent`/403), então o popup do GIS quase sempre falha; o
// cadastro por e-mail/senha funciona. Usamos isto para liderar com e-mail e
// despriorizar o botão do Google no gate do /sono.
//
// `ua` é injetável para teste; por padrão lê o navigator (com guarda p/ SSR).
const IN_APP_PATTERNS = [
  /FBAN/i, // Facebook app (iOS)
  /FBAV/i, // Facebook app version (iOS/Android)
  /FB_IAB/i, // Facebook In-App Browser (Android)
  /Instagram/i,
  /\bLine\//i, // LINE in-app
  /Messenger/i,
  /;\s?wv\b/i, // Android System WebView
];

export function isInAppBrowser(
  ua: string | undefined = typeof navigator !== 'undefined' ? navigator.userAgent : '',
): boolean {
  if (!ua) return false;
  return IN_APP_PATTERNS.some((re) => re.test(ua));
}

/** Ambiente do navegador, para instrumentar o funil pago (tráfego frio vem
 *  quase todo de in-app do Instagram/Facebook, onde a travessia pro app do
 *  banco é o ponto que mais quebra a conversão). Valores em snake_case pra
 *  virar super property `browser_env` no Mixpanel. */
export type BrowserEnv = 'inapp_instagram' | 'inapp_facebook' | 'browser_normal';

export function classifyBrowserEnv(
  ua: string | undefined = typeof navigator !== 'undefined' ? navigator.userAgent : '',
): BrowserEnv {
  if (ua) {
    if (/Instagram/i.test(ua)) return 'inapp_instagram';
    if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'inapp_facebook';
  }
  return 'browser_normal';
}
