import { describe, it, expect } from 'vitest';
import { emailFromIdToken } from '../emailFromIdToken';

// Monta um JWT fake (header.payload.signature) com payload base64url.
function makeJwt(payload: Record<string, unknown>): string {
  const b64url = (obj: Record<string, unknown>) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64url({ alg: 'RS256' })}.${b64url(payload)}.sig`;
}

describe('emailFromIdToken', () => {
  it('extrai o e-mail do payload do id_token', () => {
    const token = makeJwt({ email: 'User@Gmail.com', name: 'User' });
    expect(emailFromIdToken(token)).toBe('user@gmail.com');
  });

  it('retorna null quando o payload não tem e-mail', () => {
    const token = makeJwt({ name: 'Sem Email' });
    expect(emailFromIdToken(token)).toBeNull();
  });

  it('retorna null para token malformado', () => {
    expect(emailFromIdToken('not-a-jwt')).toBeNull();
    expect(emailFromIdToken('')).toBeNull();
  });
});
