import { describe, expect, it } from 'vitest';

import {
  MIN_USER_TAG_LENGTH,
  normalizeUserTag,
  parseKioskTagIdentifyBody,
} from './kiosk-tag-identify';

describe('normalizeUserTag', () => {
  it('uppercases and strips separators', () => {
    expect(normalizeUserTag('04:a3:b2:c1')).toBe('04A3B2C1');
    expect(normalizeUserTag('04-a3-b2-c1')).toBe('04A3B2C1');
    expect(normalizeUserTag(' 04 a3 b2 c1 ')).toBe('04A3B2C1');
  });

  it('returns null for empty or too-short values', () => {
    expect(normalizeUserTag('')).toBeNull();
    expect(normalizeUserTag('   ')).toBeNull();
    expect(normalizeUserTag('AB')).toBeNull();
    expect(normalizeUserTag(null)).toBeNull();
    expect(normalizeUserTag(undefined)).toBeNull();
    expect(normalizeUserTag(123)).toBeNull();
  });

  it('accepts tags at minimum length', () => {
    const tag = 'A'.repeat(MIN_USER_TAG_LENGTH);
    expect(normalizeUserTag(tag)).toBe(tag);
  });
});

describe('parseKioskTagIdentifyBody', () => {
  it('accepts a valid userTag', () => {
    expect(parseKioskTagIdentifyBody({ userTag: '04:a3:b2:c1' })).toEqual({
      ok: true,
      value: { userTag: '04A3B2C1' },
    });
  });

  it('unwraps data wrapper', () => {
    expect(
      parseKioskTagIdentifyBody({ data: { userTag: 'aabbccdd' } }),
    ).toEqual({
      ok: true,
      value: { userTag: 'AABBCCDD' },
    });
  });

  it('rejects invalid payloads', () => {
    expect(parseKioskTagIdentifyBody(null).ok).toBe(false);
    expect(parseKioskTagIdentifyBody({}).ok).toBe(false);
    expect(parseKioskTagIdentifyBody({ userTag: 'AB' }).ok).toBe(false);
    expect(parseKioskTagIdentifyBody({ userTag: 12 }).ok).toBe(false);
  });
});
