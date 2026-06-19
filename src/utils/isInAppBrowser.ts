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
