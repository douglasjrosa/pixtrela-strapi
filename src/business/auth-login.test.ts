import { describe, expect, it } from 'vitest';

import {
  FACE_MATCH_DISTANCE_THRESHOLD,
  faceDescriptorDistance,
} from './face-vector';
import {
  buildAuthLoginUserPayload,
  isFaceMatchDistance,
  parseLoginByFaceConfirmBody,
} from './auth-login';

describe('buildAuthLoginUserPayload', () => {
  it('maps public user fields for Auth.js', () => {
    expect(
      buildAuthLoginUserPayload({
        id: 7,
        documentId: 'u7',
        username: 'maria.1234',
        email: 'maria@pixtrela.com',
        name: 'Maria',
        roleType: 'colaborator',
        blocked: false,
      }),
    ).toEqual({
      id: 7,
      documentId: 'u7',
      username: 'maria.1234',
      email: 'maria@pixtrela.com',
      name: 'Maria',
      roleType: 'colaborator',
    });
  });
});

describe('isFaceMatchDistance', () => {
  it('accepts distances below threshold', () => {
    expect(isFaceMatchDistance(0.2)).toBe(true);
    expect(isFaceMatchDistance(FACE_MATCH_DISTANCE_THRESHOLD)).toBe(false);
  });
});

describe('parseLoginByFaceConfirmBody', () => {
  it('accepts descriptor and documentId', () => {
    const descriptor = Array.from({ length: 128 }, (_, i) => i / 128);
    const parsed = parseLoginByFaceConfirmBody({
      descriptor,
      documentId: 'u1',
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.documentId).toBe('u1');
      expect(parsed.value.descriptor).toHaveLength(128);
    }
  });

  it('rejects incomplete payloads', () => {
    expect(parseLoginByFaceConfirmBody({ documentId: 'u1' }).ok).toBe(false);
    expect(
      parseLoginByFaceConfirmBody({
        descriptor: [1, 2],
        documentId: 'u1',
      }).ok,
    ).toBe(false);
  });
});

describe('faceDescriptorDistance smoke', () => {
  it('is zero for identical vectors', () => {
    const vector = Array.from({ length: 128 }, () => 0.5);
    expect(faceDescriptorDistance(vector, vector)).toBe(0);
  });
});
