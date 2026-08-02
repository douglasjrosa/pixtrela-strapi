import {
  ALLOWED_KIOSK_MEDIA_MIMES,
  MAX_KIOSK_MEDIA_BYTES,
  parseKioskMediaUploadBody,
  validateKioskMediaFile,
  type KioskMediaMime,
} from './kiosk-media-file';
import { normalizeFaceVector } from './face-vector';

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

export type ParsedKioskFacePhotoBody =
  | {
      ok: true;
      fileBase64: string;
      mimeType: string;
      fileName: string;
      faceVector: number[] | null;
    }
  | { ok: false; error?: 'invalidFaceVector' };

/**
 * Parses face-photo upload body. Optional `faceVector` must be length 128 when
 * present; when omitted, `faceVector` is null (clears stored vector).
 */
export function parseKioskColaboratorFacePhotoBody(
  body: unknown,
): ParsedKioskFacePhotoBody {
  const parsed = parseKioskMediaUploadBody(body, 'face-photo.jpg');
  if (parsed.ok === false) {
    return { ok: false };
  }

  const payload =
    body && typeof body === 'object' && 'data' in body
      ? (body as { data: unknown }).data
      : body;
  const rawVector =
    payload && typeof payload === 'object'
      ? (payload as { faceVector?: unknown }).faceVector
      : undefined;

  if (rawVector === undefined || rawVector === null) {
    return { ...parsed, faceVector: null };
  }

  const faceVector = normalizeFaceVector(rawVector);
  if (!faceVector) {
    return { ok: false, error: 'invalidFaceVector' };
  }

  return { ...parsed, faceVector };
}
