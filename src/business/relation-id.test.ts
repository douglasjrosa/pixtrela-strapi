import { describe, expect, it } from 'vitest';

import { readRelationId } from './relation-id';

describe('readRelationId', () => {
  it('reads a bare numeric id', () => {
    expect(readRelationId(4)).toBe(4);
  });

  it('reads a numeric string id', () => {
    expect(readRelationId('325')).toBe(325);
  });

  it('reads an object with id', () => {
    expect(readRelationId({ id: 4 })).toBe(4);
    expect(readRelationId({ id: '4' })).toBe(4);
  });

  it('returns null for missing or invalid values', () => {
    expect(readRelationId(null)).toBeNull();
    expect(readRelationId(undefined)).toBeNull();
    expect(readRelationId({})).toBeNull();
    expect(readRelationId('')).toBeNull();
    expect(readRelationId('abc')).toBeNull();
  });
});
