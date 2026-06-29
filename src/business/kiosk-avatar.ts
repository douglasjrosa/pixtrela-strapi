export const MAX_KIOSK_AVATAR_BYTES = 2 * 1024 * 1024;

export const ALLOWED_KIOSK_AVATAR_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type KioskAvatarMime = (typeof ALLOWED_KIOSK_AVATAR_MIMES)[number];

export function isAllowedKioskAvatarMime(mime: string): mime is KioskAvatarMime {
  return (ALLOWED_KIOSK_AVATAR_MIMES as readonly string[]).includes(mime);
}

export function validateKioskAvatarFile(
  buffer: Buffer,
  mime: string,
  size: number,
): { ok: true } | { ok: false; error: 'invalidType' | 'tooLarge' | 'empty' } {
  if (!buffer.length || size <= 0) {
    return { ok: false, error: 'empty' };
  }
  if (!isAllowedKioskAvatarMime(mime)) {
    return { ok: false, error: 'invalidType' };
  }
  if (size > MAX_KIOSK_AVATAR_BYTES) {
    return { ok: false, error: 'tooLarge' };
  }
  return { ok: true };
}

export function parseKioskColaboratorAvatarBody(
  body: unknown,
): { ok: true; fileBase64: string; mimeType: string; fileName: string } | { ok: false } {
  const payload =
    body && typeof body === 'object' && 'data' in body
      ? (body as { data: unknown }).data
      : body;

  if (!payload || typeof payload !== 'object') {
    return { ok: false };
  }

  const fileBase64 = (payload as { fileBase64?: unknown }).fileBase64;
  const mimeType = (payload as { mimeType?: unknown }).mimeType;
  const fileName = (payload as { fileName?: unknown }).fileName;

  if (typeof fileBase64 !== 'string' || fileBase64.length === 0) {
    return { ok: false };
  }
  if (typeof mimeType !== 'string' || mimeType.length === 0) {
    return { ok: false };
  }

  return {
    ok: true,
    fileBase64,
    mimeType,
    fileName: typeof fileName === 'string' && fileName.length > 0 ? fileName : 'avatar.jpg',
  };
}
