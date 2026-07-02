import { describe, it, expect } from 'vitest';
import { isInAppBrowser, isMetaInAppBrowser, classifyBrowserEnv } from '../isInAppBrowser';

// UAs reais (encurtados) dos navegadores embarcados que mais aparecem no tráfego pago.
const UA = {
  instagram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 339.0.0.30.105 (iPhone14,3; iOS 17_5)',
  facebookIOS:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 [FBAN/FBIOS;FBAV/466.0.0.30.107;FBBV/]',
  facebookAndroid:
    'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/466.0.0.0;]',
  androidWebView:
    'Mozilla/5.0 (Linux; Android 13; SM-G991B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  safariIOS:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  desktopChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};

describe('isInAppBrowser', () => {
  it('detecta o navegador embarcado do Instagram', () => {
    expect(isInAppBrowser(UA.instagram)).toBe(true);
  });

  it('detecta o navegador embarcado do Facebook (iOS e Android)', () => {
    expect(isInAppBrowser(UA.facebookIOS)).toBe(true);
    expect(isInAppBrowser(UA.facebookAndroid)).toBe(true);
  });

  it('detecta Android WebView genérico (; wv)', () => {
    expect(isInAppBrowser(UA.androidWebView)).toBe(true);
  });

  it('retorna false para navegadores normais (Chrome/Safari/desktop)', () => {
    expect(isInAppBrowser(UA.chromeAndroid)).toBe(false);
    expect(isInAppBrowser(UA.safariIOS)).toBe(false);
    expect(isInAppBrowser(UA.desktopChrome)).toBe(false);
  });

  it('é seguro com UA vazio/indefinido', () => {
    expect(isInAppBrowser('')).toBe(false);
    expect(isInAppBrowser(undefined)).toBe(false);
  });
});

describe('isMetaInAppBrowser', () => {
  it('detecta Instagram e Facebook (FBAN/FBAV)', () => {
    expect(isMetaInAppBrowser(UA.instagram)).toBe(true);
    expect(isMetaInAppBrowser(UA.facebookIOS)).toBe(true);
    expect(isMetaInAppBrowser(UA.facebookAndroid)).toBe(true);
  });

  it('NÃO marca WebView genérico nem navegadores normais (mais estrito que isInAppBrowser)', () => {
    expect(isMetaInAppBrowser(UA.androidWebView)).toBe(false);
    expect(isMetaInAppBrowser(UA.chromeAndroid)).toBe(false);
    expect(isMetaInAppBrowser(UA.safariIOS)).toBe(false);
    expect(isMetaInAppBrowser(UA.desktopChrome)).toBe(false);
  });

  it('é seguro com UA vazio/indefinido', () => {
    expect(isMetaInAppBrowser('')).toBe(false);
    expect(isMetaInAppBrowser(undefined)).toBe(false);
  });
});

describe('classifyBrowserEnv', () => {
  it('classifica o in-app do Instagram', () => {
    expect(classifyBrowserEnv(UA.instagram)).toBe('inapp_instagram');
  });

  it('classifica o in-app do Facebook (iOS e Android)', () => {
    expect(classifyBrowserEnv(UA.facebookIOS)).toBe('inapp_facebook');
    expect(classifyBrowserEnv(UA.facebookAndroid)).toBe('inapp_facebook');
  });

  it('trata navegadores normais como browser_normal', () => {
    expect(classifyBrowserEnv(UA.chromeAndroid)).toBe('browser_normal');
    expect(classifyBrowserEnv(UA.safariIOS)).toBe('browser_normal');
    expect(classifyBrowserEnv(UA.desktopChrome)).toBe('browser_normal');
    // WebView genérico não é IG nem FB → normal (não temos como atribuir).
    expect(classifyBrowserEnv(UA.androidWebView)).toBe('browser_normal');
  });

  it('é seguro com UA vazio/indefinido', () => {
    expect(classifyBrowserEnv('')).toBe('browser_normal');
    expect(classifyBrowserEnv(undefined)).toBe('browser_normal');
  });
});
