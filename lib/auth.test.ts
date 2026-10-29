import { describe, expect, it } from 'vitest';
import { createSessionToken, pinMatches, readCookie, verifySessionToken } from './auth.ts';

describe('auth', () => {
  it('accepts only the right pin', () => {
    expect(pinMatches('1234', '1234')).toBe(true);
    expect(pinMatches('0000', '1234')).toBe(false);
    expect(pinMatches(undefined, '1234')).toBe(false);
  });

  it('signs, verifies, expires and rejects tampered tokens', async () => {
    const token = await createSessionToken('s', 1000);
    expect(await verifySessionToken(token, 's', 2000)).toBe(true);
    expect(await verifySessionToken(token, 'other', 2000)).toBe(false);
    expect(await verifySessionToken(token, 's', 1000 + 13 * 3600 * 1000)).toBe(false);
    expect(await verifySessionToken(`9999999999999.${token.split('.')[1]}`, 's', 2000)).toBe(false);
    expect(await verifySessionToken(undefined, 's')).toBe(false);
  });

  it('reads cookies', () => {
    expect(readCookie('a=1; dg_session=xyz', 'dg_session')).toBe('xyz');
  });
});
