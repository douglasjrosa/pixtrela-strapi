import {
  parseKioskMediaUploadBody,
  validateKioskMediaFile,
  MAX_KIOSK_MEDIA_BYTES,
} from './kiosk-media-file';
import { canEditOwnProfile } from './profile-access';

export function assertCanUpdateOwnAvatar(
  roleType: string | null | undefined,
): void {
  if (!canEditOwnProfile(roleType)) {
    throw new Error('forbidden');
  }
}

export function parseOwnAvatarBody(
  body: unknown,
): { ok: true; fileBase64: string; mimeType: string; fileName: string } | { ok: false } {
  return parseKioskMediaUploadBody(body, 'avatar.jpg');
}

export function validateOwnAvatarFile(
  buffer: Buffer,
  mime: string,
  size: number,
): { ok: true } | { ok: false; error: 'invalidType' | 'tooLarge' | 'empty' } {
  return validateKioskMediaFile(buffer, mime, size, MAX_KIOSK_MEDIA_BYTES);
}
