import { describe, expect, it } from 'vitest';

import {
  mapActiveDirectoryTeams,
  mapDirectoryColaborators,
} from './kiosk-directory';

describe('mapActiveDirectoryTeams', () => {
  it('keeps only teams without untill and sorts by name', () => {
    expect(
      mapActiveDirectoryTeams([
        { documentId: 't2', name: 'Beta', untill: null },
        { documentId: 't1', name: 'Alpha', untill: null },
        { documentId: 't3', name: 'Archived', untill: '2026-01-01' },
      ]),
    ).toEqual([
      { documentId: 't1', name: 'Alpha' },
      { documentId: 't2', name: 'Beta' },
    ]);
  });
});

describe('mapDirectoryColaborators', () => {
  it('keeps active colaborators with facePhotoUrl and sorts by name', () => {
    expect(
      mapDirectoryColaborators([
        {
          documentId: 'c2',
          name: 'Bruno',
          roleType: 'colaborator',
          blocked: false,
          facePhoto: { url: '/uploads/b.jpg' },
        },
        {
          documentId: 'c1',
          name: 'Ana',
          roleType: 'colaborator',
          blocked: false,
          facePhoto: null,
        },
        {
          documentId: 'c3',
          name: 'Blocked',
          roleType: 'colaborator',
          blocked: true,
        },
        {
          documentId: 'c4',
          name: 'Leader',
          roleType: 'leader',
          blocked: false,
        },
      ]),
    ).toEqual([
      { documentId: 'c1', name: 'Ana', facePhotoUrl: null },
      { documentId: 'c2', name: 'Bruno', facePhotoUrl: '/uploads/b.jpg' },
    ]);
  });
});
