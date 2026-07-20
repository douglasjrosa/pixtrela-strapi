export const MAX_KIOSK_MEDIA_BYTES = 2 * 1024 * 1024;

export const ALLOWED_KIOSK_MEDIA_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type KioskMediaMime = (typeof ALLOWED_KIOSK_MEDIA_MIMES)[number];

export function isAllowedKioskMediaMime(mime: string): mime is KioskMediaMime {
  return (ALLOWED_KIOSK_MEDIA_MIMES as readonly string[]).includes(mime);
}

export function validateKioskMediaFile(
  buffer: Buffer,
  mime: string,
  size: number,
  maxBytes: number = MAX_KIOSK_MEDIA_BYTES,
): { ok: true } | { ok: false; error: 'invalidType' | 'tooLarge' | 'empty' } {
  if (!buffer.length || size <= 0) {
    return { ok: false, error: 'empty' };
  }
  if (!isAllowedKioskMediaMime(mime)) {
    return { ok: false, error: 'invalidType' };
  }
  if (size > maxBytes) {
    return { ok: false, error: 'tooLarge' };
  }
  return { ok: true };
}

export function parseKioskMediaUploadBody(
  body: unknown,
  defaultFileName: string,
):
  | { ok: true; fileBase64: string; mimeType: string; fileName: string }
  | { ok: false } {
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
    fileName:
      typeof fileName === 'string' && fileName.length > 0
        ? fileName
        : defaultFileName,
  };
}
