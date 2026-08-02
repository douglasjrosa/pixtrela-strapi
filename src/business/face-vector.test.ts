import { describe, expect, it } from 'vitest';

import {
  FACE_1N_AMBIGUITY_MARGIN,
  FACE_DESCRIPTOR_LENGTH,
  FACE_MATCH_DISTANCE_THRESHOLD,
  faceDescriptorDistance,
  normalizeFaceVector,
  rankFaceMatches,
} from './face-vector';

function makeVector(seed: number): number[] {
  return Array.from({ length: FACE_DESCRIPTOR_LENGTH }, (_, index) => {
    return ((seed + index) % 17) / 17;
  });
}

describe('normalizeFaceVector', () => {
  it('accepts a finite number array of length 128', () => {
    const vector = makeVector(1);
    expect(normalizeFaceVector(vector)).toEqual(vector);
  });

  it('rejects wrong length, non-arrays, and non-finite values', () => {
    expect(normalizeFaceVector(null)).toBeNull();
    expect(normalizeFaceVector([1, 2, 3])).toBeNull();
    expect(normalizeFaceVector('nope')).toBeNull();
    const bad = makeVector(2);
    bad[0] = Number.NaN;
    expect(normalizeFaceVector(bad)).toBeNull();
  });
});

describe('faceDescriptorDistance', () => {
  it('returns 0 for identical vectors', () => {
    const vector = makeVector(3);
    expect(faceDescriptorDistance(vector, vector)).toBe(0);
  });

  it('returns infinity for mismatched lengths', () => {
    expect(faceDescriptorDistance([1], [1, 2])).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('rankFaceMatches', () => {
  const threshold = FACE_MATCH_DISTANCE_THRESHOLD;
  const margin = FACE_1N_AMBIGUITY_MARGIN;

  it('returns none when gallery is empty or probe invalid', () => {
    expect(
      rankFaceMatches(makeVector(1), [], { threshold, margin }).status,
    ).toBe('none');
    expect(
      rankFaceMatches([1], [{ documentId: 'a', faceVector: makeVector(1) }], {
        threshold,
        margin,
      }).status,
    ).toBe('none');
  });

  it('returns match when only one candidate is under threshold with gap', () => {
    const probe = makeVector(10);
    const close = probe.map((value) => value + 0.001);
    const far = makeVector(99);
    const result = rankFaceMatches(
      probe,
      [
        { documentId: 'close', faceVector: close },
        { documentId: 'far', faceVector: far },
      ],
      { threshold, margin },
    );
    expect(result.status).toBe('match');
    expect(result.ranked[0]?.documentId).toBe('close');
  });

  it('returns ambiguous when two candidates are under threshold and close', () => {
    const probe = makeVector(20);
    const first = probe.map((value) => value + 0.001);
    const second = probe.map((value) => value + 0.002);
    const result = rankFaceMatches(
      probe,
      [
        { documentId: 'a', faceVector: first },
        { documentId: 'b', faceVector: second },
      ],
      { threshold, margin },
    );
    expect(result.status).toBe('ambiguous');
    expect(result.ranked.length).toBeGreaterThanOrEqual(2);
  });

  it('returns none when nobody is under threshold', () => {
    const probe = makeVector(30);
    const far = makeVector(77);
    const result = rankFaceMatches(
      probe,
      [{ documentId: 'far', faceVector: far }],
      { threshold, margin },
    );
    expect(result.status).toBe('none');
  });
});
