import { describe, expect, it } from 'vitest';

import {
  MAX_KIOSK_FACE_PHOTO_BYTES,
  parseKioskColaboratorFacePhotoBody,
  validateKioskFacePhotoFile,
} from './kiosk-face-photo';

describe('validateKioskFacePhotoFile', () => {
  it('accepts allowed image types within size limit', () => {
    const buffer = Buffer.from('jpeg-data');
    expect(validateKioskFacePhotoFile(buffer, 'image/jpeg', buffer.length)).toEqual({
      ok: true,
    });
  });

  it('rejects empty files', () => {
    expect(validateKioskFacePhotoFile(Buffer.alloc(0), 'image/jpeg', 0)).toEqual({
      ok: false,
      error: 'empty',
    });
  });

  it('rejects unsupported mime types', () => {
    const buffer = Buffer.from('data');
    expect(validateKioskFacePhotoFile(buffer, 'image/gif', buffer.length)).toEqual({
      ok: false,
      error: 'invalidType',
    });
  });

  it('rejects files above max size', () => {
    expect(
      validateKioskFacePhotoFile(
        Buffer.alloc(10),
        'image/jpeg',
        MAX_KIOSK_FACE_PHOTO_BYTES + 1,
      ),
    ).toEqual({ ok: false, error: 'tooLarge' });
  });
});

describe('parseKioskColaboratorFacePhotoBody', () => {
  it('accepts base64 payload', () => {
    expect(
      parseKioskColaboratorFacePhotoBody({
        fileBase64: 'abc',
        mimeType: 'image/jpeg',
        fileName: 'face.jpg',
      }),
    ).toEqual({
      ok: true,
      fileBase64: 'abc',
      mimeType: 'image/jpeg',
      fileName: 'face.jpg',
    });
  });

  it('defaults fileName when missing', () => {
    expect(
      parseKioskColaboratorFacePhotoBody({
        fileBase64: 'abc',
        mimeType: 'image/png',
      }),
    ).toEqual({
      ok: true,
      fileBase64: 'abc',
      mimeType: 'image/png',
      fileName: 'face-photo.jpg',
    });
  });

  it('rejects invalid payloads', () => {
    expect(parseKioskColaboratorFacePhotoBody(null).ok).toBe(false);
    expect(parseKioskColaboratorFacePhotoBody({ mimeType: 'image/jpeg' }).ok).toBe(
      false,
    );
  });
});
