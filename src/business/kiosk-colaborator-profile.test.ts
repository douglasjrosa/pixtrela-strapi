import { describe, expect, it } from 'vitest';

import { mapKioskColaboratorProfile } from './kiosk-colaborator-profile';

describe('mapKioskColaboratorProfile', () => {
  it('maps name and avatar url', () => {
    expect(
      mapKioskColaboratorProfile({
        documentId: 'c1',
        name: 'Ana Silva',
        avatar: { url: '/uploads/ana.jpg' },
      }),
    ).toEqual({
      documentId: 'c1',
      name: 'Ana Silva',
      avatarUrl: '/uploads/ana.jpg',
    });
  });

  it('falls back to username and null avatar', () => {
    expect(
      mapKioskColaboratorProfile({
        document_id: 'c2',
        username: 'bruno',
        avatar: null,
      }),
    ).toEqual({
      documentId: 'c2',
      name: 'bruno',
      avatarUrl: null,
    });
  });

  it('returns null when id or name is missing', () => {
    expect(mapKioskColaboratorProfile({ name: 'Ana' })).toBeNull();
    expect(mapKioskColaboratorProfile({ documentId: 'c1' })).toBeNull();
  });
});
