import { canEditOwnProfile } from './profile-access';

const MIN_NAME_LENGTH = 1;
const MIN_EMAIL_LENGTH = 6;
/** Brazilian mobile: DDD (2) + 9 + 8 digits = 11 national digits. */
const BR_MOBILE_NATIONAL_LENGTH = 11;
const BR_COUNTRY_CODE = '55';
const BR_MOBILE_NINTH_DIGIT = '9';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type OwnPersonalFields = {
  name: string;
  lastName: string;
  email: string;
  phone: string;
};

export type ParseOwnPersonalResult =
  | { ok: true; data: OwnPersonalFields }
  | { ok: false; error: 'invalid' | 'invalidEmail' | 'invalidPhone' };

export function assertCanUpdateOwnPersonal(
  roleType: string | null | undefined,
): void {
  if (!canEditOwnProfile(roleType)) {
    throw new Error('forbidden');
  }
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** Normalize to 11-digit Brazilian mobile (DDD + 9xxxxxxxx). */
export function normalizeBrMobilePhone(value: string): string | null {
  const digits = digitsOnly(value);
  const national =
    digits.startsWith(BR_COUNTRY_CODE) &&
    digits.length === BR_MOBILE_NATIONAL_LENGTH + BR_COUNTRY_CODE.length
      ? digits.slice(BR_COUNTRY_CODE.length)
      : digits;

  if (national.length !== BR_MOBILE_NATIONAL_LENGTH) return null;
  if (national[2] !== BR_MOBILE_NINTH_DIGIT) return null;
  return national;
}

export function isValidBrMobilePhone(value: string): boolean {
  return normalizeBrMobilePhone(value) !== null;
}

export function parseOwnPersonalBody(body: unknown): ParseOwnPersonalResult {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'invalid' };
  }

  const record = body as Record<string, unknown>;
  const name = typeof record.name === 'string' ? record.name.trim() : '';
  const lastName =
    typeof record.lastName === 'string' ? record.lastName.trim() : '';
  const email = typeof record.email === 'string' ? record.email.trim() : '';
  const phone = typeof record.phone === 'string' ? record.phone.trim() : '';

  if (name.length < MIN_NAME_LENGTH || lastName.length < MIN_NAME_LENGTH) {
    return { ok: false, error: 'invalid' };
  }

  if (
    email.length < MIN_EMAIL_LENGTH ||
    !EMAIL_RE.test(email)
  ) {
    return { ok: false, error: 'invalidEmail' };
  }

  const normalizedPhone = normalizeBrMobilePhone(phone);
  if (!normalizedPhone) {
    return { ok: false, error: 'invalidPhone' };
  }

  return {
    ok: true,
    data: {
      name,
      lastName,
      email: email.toLowerCase(),
      phone: normalizedPhone,
    },
  };
}
