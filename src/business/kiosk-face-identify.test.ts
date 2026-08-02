import { describe, expect, it } from 'vitest';

import {
  parseKioskFaceIdentifyBody,
  mapFaceIdentifyCandidate,
} from './kiosk-face-identify';
import { FACE_DESCRIPTOR_LENGTH } from './face-vector';

function makeVector(seed: number): number[] {
  return Array.from({ length: FACE_DESCRIPTOR_LENGTH }, (_, index) => {
    return ((seed + index) % 17) / 17;
  });
}

describe('parseKioskFaceIdentifyBody', () => {
  it('accepts a valid descriptor', () => {
    const descriptor = makeVector(1);
    expect(parseKioskFaceIdentifyBody({ descriptor })).toEqual({
      ok: true,
      descriptor,
    });
  });

  it('unwraps data wrapper', () => {
    const descriptor = makeVector(2);
    expect(parseKioskFaceIdentifyBody({ data: { descriptor } })).toEqual({
      ok: true,
      descriptor,
    });
  });

  it('rejects invalid descriptors', () => {
    expect(parseKioskFaceIdentifyBody(null).ok).toBe(false);
    expect(parseKioskFaceIdentifyBody({ descriptor: [1, 2] }).ok).toBe(false);
    expect(parseKioskFaceIdentifyBody({}).ok).toBe(false);
  });
});

describe('mapFaceIdentifyCandidate', () => {
  it('maps user fields and optional faceVector', () => {
    const vector = makeVector(3);
    expect(
      mapFaceIdentifyCandidate(
        {
          documentId: 'u1',
          name: 'Ana',
          greetingGender: 'feminine',
          faceVector: vector,
          avatar: { url: '/uploads/a.jpg' },
          facePhoto: { url: '/uploads/f.jpg' },
        },
        { includeFaceVector: true },
      ),
    ).toEqual({
      documentId: 'u1',
      name: 'Ana',
      greetingGender: 'feminine',
      avatarUrl: '/uploads/a.jpg',
      facePhotoUrl: '/uploads/f.jpg',
      faceVector: vector,
    });
  });

  it('omits faceVector when not requested', () => {
    const mapped = mapFaceIdentifyCandidate(
      {
        documentId: 'u1',
        name: 'Ana',
        faceVector: makeVector(4),
      },
      { includeFaceVector: false },
    );
    expect(mapped.faceVector).toBeUndefined();
  });
});
