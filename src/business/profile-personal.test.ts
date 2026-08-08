import { describe, expect, it } from 'vitest';

import {
  assertCanUpdateOwnPersonal,
  isValidBrMobilePhone,
  normalizeBrMobilePhone,
  parseOwnPersonalBody,
} from './profile-personal';

describe('assertCanUpdateOwnPersonal', () => {
  it('allows eligible roles', () => {
    expect(() => assertCanUpdateOwnPersonal('colaborator')).not.toThrow();
    expect(() => assertCanUpdateOwnPersonal('manager')).not.toThrow();
  });

  it('rejects admin and kiosk', () => {
    expect(() => assertCanUpdateOwnPersonal('admin')).toThrow('forbidden');
    expect(() => assertCanUpdateOwnPersonal('kiosk')).toThrow('forbidden');
  });
});

describe('normalizeBrMobilePhone', () => {
  it('accepts formatted Brazilian mobiles', () => {
    expect(normalizeBrMobilePhone('(11) 98765-4321')).toBe('11987654321');
    expect(normalizeBrMobilePhone('11987654321')).toBe('11987654321');
    expect(normalizeBrMobilePhone('+55 11 98765-4321')).toBe('11987654321');
  });

  it('rejects landlines and short numbers', () => {
    expect(normalizeBrMobilePhone('(11) 3456-7890')).toBeNull();
    expect(normalizeBrMobilePhone('1198765')).toBeNull();
  });
});

describe('isValidBrMobilePhone', () => {
  it('returns true for valid cell phones', () => {
    expect(isValidBrMobilePhone('11987654321')).toBe(true);
  });
});

describe('parseOwnPersonalBody', () => {
  it('accepts a valid personal payload', () => {
    expect(
      parseOwnPersonalBody({
        name: ' Ana ',
        lastName: ' Silva ',
        email: 'Ana@Example.com',
        phone: '(11) 98765-4321',
      }),
    ).toEqual({
      ok: true,
      data: {
        name: 'Ana',
        lastName: 'Silva',
        email: 'ana@example.com',
        phone: '11987654321',
      },
    });
  });

  it('rejects missing name or lastName', () => {
    expect(
      parseOwnPersonalBody({
        name: '',
        lastName: 'Silva',
        email: 'ana@example.com',
        phone: '11987654321',
      }),
    ).toEqual({ ok: false, error: 'invalid' });
  });

  it('rejects invalid email', () => {
    expect(
      parseOwnPersonalBody({
        name: 'Ana',
        lastName: 'Silva',
        email: 'not-an-email',
        phone: '11987654321',
      }),
    ).toEqual({ ok: false, error: 'invalidEmail' });
  });

  it('rejects invalid phone', () => {
    expect(
      parseOwnPersonalBody({
        name: 'Ana',
        lastName: 'Silva',
        email: 'ana@example.com',
        phone: '1134567890',
      }),
    ).toEqual({ ok: false, error: 'invalidPhone' });
  });
});
