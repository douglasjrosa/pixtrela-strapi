import { describe, expect, it } from 'vitest';

import {
  MAX_KIOSK_AVATAR_BYTES,
  parseKioskColaboratorAvatarBody,
  validateKioskAvatarFile,
} from './kiosk-avatar';

describe('validateKioskAvatarFile', () => {
  it('accepts allowed image types within size limit', () => {
    const buffer = Buffer.from('jpeg-data');
    expect(validateKioskAvatarFile(buffer, 'image/jpeg', buffer.length)).toEqual({
      ok: true,
    });
  });

  it('rejects empty files', () => {
    expect(validateKioskAvatarFile(Buffer.alloc(0), 'image/jpeg', 0)).toEqual({
      ok: false,
      error: 'empty',
    });
  });

  it('rejects unsupported mime types', () => {
    const buffer = Buffer.from('data');
    expect(validateKioskAvatarFile(buffer, 'image/gif', buffer.length)).toEqual({
      ok: false,
      error: 'invalidType',
    });
  });

  it('rejects files above max size', () => {
    expect(
      validateKioskAvatarFile(
        Buffer.alloc(10),
        'image/jpeg',
        MAX_KIOSK_AVATAR_BYTES + 1,
      ),
    ).toEqual({ ok: false, error: 'tooLarge' });
  });
});

describe('parseKioskColaboratorAvatarBody', () => {
  it('accepts base64 payload', () => {
    expect(
      parseKioskColaboratorAvatarBody({
        fileBase64: 'abc',
        mimeType: 'image/jpeg',
        fileName: 'avatar.jpg',
      }),
    ).toEqual({
      ok: true,
      fileBase64: 'abc',
      mimeType: 'image/jpeg',
      fileName: 'avatar.jpg',
    });
  });

  it('rejects invalid payloads', () => {
    expect(parseKioskColaboratorAvatarBody(null).ok).toBe(false);
    expect(parseKioskColaboratorAvatarBody({ mimeType: 'image/jpeg' }).ok).toBe(false);
  });
});
