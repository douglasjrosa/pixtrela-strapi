import { describe, expect, it } from 'vitest';

import { mapWelcomeProfile } from './welcome-profile';

describe('mapWelcomeProfile', () => {
  it('maps name, gender and media urls', () => {
    expect(
      mapWelcomeProfile({
        name: 'Ana',
        greetingGender: 'feminine',
        avatar: { url: '/uploads/a.jpg' },
        facePhoto: { url: '/uploads/f.jpg' },
      }),
    ).toEqual({
      name: 'Ana',
      greetingGender: 'feminine',
      avatarUrl: '/uploads/a.jpg',
      facePhotoUrl: '/uploads/f.jpg',
    });
  });

  it('falls back to username and null media', () => {
    expect(mapWelcomeProfile({ username: 'bruno.1' })).toEqual({
      name: 'bruno.1',
      greetingGender: null,
      avatarUrl: null,
      facePhotoUrl: null,
    });
  });
});
