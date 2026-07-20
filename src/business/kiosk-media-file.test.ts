import { describe, expect, it } from 'vitest';

import {
  MAX_KIOSK_MEDIA_BYTES,
  parseKioskMediaUploadBody,
  validateKioskMediaFile,
} from './kiosk-media-file';

describe('validateKioskMediaFile', () => {
  it('accepts allowed image types within size limit', () => {
    const buffer = Buffer.from('jpeg-data');
    expect(validateKioskMediaFile(buffer, 'image/jpeg', buffer.length)).toEqual({
      ok: true,
    });
  });

  it('rejects empty, invalid type, and oversized files', () => {
    expect(validateKioskMediaFile(Buffer.alloc(0), 'image/jpeg', 0)).toEqual({
      ok: false,
      error: 'empty',
    });
    expect(validateKioskMediaFile(Buffer.from('x'), 'image/gif', 1)).toEqual({
      ok: false,
      error: 'invalidType',
    });
    expect(
      validateKioskMediaFile(Buffer.alloc(10), 'image/jpeg', MAX_KIOSK_MEDIA_BYTES + 1),
    ).toEqual({ ok: false, error: 'tooLarge' });
  });
});

describe('parseKioskMediaUploadBody', () => {
  it('parses payload and applies default file name', () => {
    expect(
      parseKioskMediaUploadBody(
        { fileBase64: 'abc', mimeType: 'image/png' },
        'fallback.jpg',
      ),
    ).toEqual({
      ok: true,
      fileBase64: 'abc',
      mimeType: 'image/png',
      fileName: 'fallback.jpg',
    });
  });

  it('rejects invalid payloads', () => {
    expect(parseKioskMediaUploadBody(null, 'x.jpg').ok).toBe(false);
  });
});
