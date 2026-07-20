import {
  ALLOWED_KIOSK_MEDIA_MIMES,
  MAX_KIOSK_MEDIA_BYTES,
  parseKioskMediaUploadBody,
  validateKioskMediaFile,
  type KioskMediaMime,
} from './kiosk-media-file';

export const MAX_KIOSK_FACE_PHOTO_BYTES = MAX_KIOSK_MEDIA_BYTES;
export const ALLOWED_KIOSK_FACE_PHOTO_MIMES = ALLOWED_KIOSK_MEDIA_MIMES;
export type KioskFacePhotoMime = KioskMediaMime;

export function isAllowedKioskFacePhotoMime(
  mime: string,
): mime is KioskFacePhotoMime {
  return (ALLOWED_KIOSK_FACE_PHOTO_MIMES as readonly string[]).includes(mime);
}

export function validateKioskFacePhotoFile(
  buffer: Buffer,
  mime: string,
  size: number,
): { ok: true } | { ok: false; error: 'invalidType' | 'tooLarge' | 'empty' } {
  return validateKioskMediaFile(buffer, mime, size, MAX_KIOSK_FACE_PHOTO_BYTES);
}

export function parseKioskColaboratorFacePhotoBody(
  body: unknown,
):
  | { ok: true; fileBase64: string; mimeType: string; fileName: string }
  | { ok: false } {
  return parseKioskMediaUploadBody(body, 'face-photo.jpg');
}
