/** Minimum hex length after normalization (typical NFC UID is 4+ bytes). */
export const MIN_USER_TAG_LENGTH = 4;

export type KioskTagIdentifyInput = {
  userTag: string;
};

type ParseResult =
  | { ok: true; value: KioskTagIdentifyInput }
  | { ok: false; error: string };

function unwrapRequestBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const record = body as Record<string, unknown>;
  if (record.data && typeof record.data === 'object') {
    return record.data;
  }
  return body;
}

/**
 * Normalizes an NFC serial number for storage/lookup:
 * uppercase, strip `:`, `-`, and whitespace.
 */
export function normalizeUserTag(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const normalized = raw
    .trim()
    .toUpperCase()
    .replace(/[:\-\s]/g, '');
  if (normalized.length < MIN_USER_TAG_LENGTH) return null;
  return normalized;
}

export function parseKioskTagIdentifyBody(body: unknown): ParseResult {
  const payload = unwrapRequestBody(body);
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'Invalid body' };
  }

  const userTag = normalizeUserTag(
    (payload as Record<string, unknown>).userTag,
  );
  if (!userTag) {
    return { ok: false, error: 'Invalid userTag' };
  }

  return { ok: true, value: { userTag } };
}
