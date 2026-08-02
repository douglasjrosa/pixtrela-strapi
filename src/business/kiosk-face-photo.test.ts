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
  it('accepts base64 payload and clears faceVector when omitted', () => {
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
      faceVector: null,
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
      faceVector: null,
    });
  });

  it('accepts a valid faceVector', () => {
    const faceVector = Array.from({ length: 128 }, (_, i) => i / 128);
    const parsed = parseKioskColaboratorFacePhotoBody({
      fileBase64: 'abc',
      mimeType: 'image/jpeg',
      faceVector,
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.faceVector).toEqual(faceVector);
    }
  });

  it('rejects invalid faceVector length', () => {
    const parsed = parseKioskColaboratorFacePhotoBody({
      fileBase64: 'abc',
      mimeType: 'image/jpeg',
      faceVector: [1, 2, 3],
    });
    expect(parsed).toEqual({ ok: false, error: 'invalidFaceVector' });
  });

  it('rejects invalid payloads', () => {
    expect(parseKioskColaboratorFacePhotoBody(null).ok).toBe(false);
    expect(parseKioskColaboratorFacePhotoBody({ mimeType: 'image/jpeg' }).ok).toBe(
      false,
    );
  });
});
