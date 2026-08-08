import { describe, expect, it } from 'vitest';

import {
  assertCanUpdateOwnAvatar,
  parseOwnAvatarBody,
  validateOwnAvatarFile,
} from './profile-avatar';

describe('assertCanUpdateOwnAvatar', () => {
  it('allows eligible roles', () => {
    expect(() => assertCanUpdateOwnAvatar('colaborator')).not.toThrow();
    expect(() => assertCanUpdateOwnAvatar('leader')).not.toThrow();
  });

  it('rejects admin and kiosk', () => {
    expect(() => assertCanUpdateOwnAvatar('admin')).toThrow('forbidden');
    expect(() => assertCanUpdateOwnAvatar('kiosk')).toThrow('forbidden');
  });
});

describe('parseOwnAvatarBody', () => {
  it('accepts base64 avatar payload', () => {
    expect(
      parseOwnAvatarBody({
        fileBase64: 'abc',
        mimeType: 'image/jpeg',
        fileName: 'me.jpg',
      }),
    ).toEqual({
      ok: true,
      fileBase64: 'abc',
      mimeType: 'image/jpeg',
      fileName: 'me.jpg',
    });
  });
});

describe('validateOwnAvatarFile', () => {
  it('accepts a small jpeg', () => {
    const buffer = Buffer.from([0xff, 0xd8, 0xff]);
    expect(validateOwnAvatarFile(buffer, 'image/jpeg', buffer.length)).toEqual({
      ok: true,
    });
  });
});
