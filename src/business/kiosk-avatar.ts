import {
  ALLOWED_KIOSK_MEDIA_MIMES,
  MAX_KIOSK_MEDIA_BYTES,
  parseKioskMediaUploadBody,
  validateKioskMediaFile,
  type KioskMediaMime,
} from './kiosk-media-file';

export const MAX_KIOSK_AVATAR_BYTES = MAX_KIOSK_MEDIA_BYTES;
export const ALLOWED_KIOSK_AVATAR_MIMES = ALLOWED_KIOSK_MEDIA_MIMES;
export type KioskAvatarMime = KioskMediaMime;

export function isAllowedKioskAvatarMime(mime: string): mime is KioskAvatarMime {
  return (ALLOWED_KIOSK_AVATAR_MIMES as readonly string[]).includes(mime);
}

export function validateKioskAvatarFile(
  buffer: Buffer,
  mime: string,
  size: number,
): { ok: true } | { ok: false; error: 'invalidType' | 'tooLarge' | 'empty' } {
  return validateKioskMediaFile(buffer, mime, size, MAX_KIOSK_AVATAR_BYTES);
}

export function parseKioskColaboratorAvatarBody(
  body: unknown,
): { ok: true; fileBase64: string; mimeType: string; fileName: string } | { ok: false } {
  return parseKioskMediaUploadBody(body, 'avatar.jpg');
}
