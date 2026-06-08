import { describe, expect, it } from 'vitest';

import { shouldResolveRoleFromRoleType } from './user-role-sync';

describe('shouldResolveRoleFromRoleType', () => {
  it('returns true when only roleType is set', () => {
    expect(shouldResolveRoleFromRoleType({ roleType: 'colaborator' })).toBe(true);
  });

  it('returns false when role is already provided', () => {
    expect(
      shouldResolveRoleFromRoleType({ roleType: 'colaborator', role: 4 }),
    ).toBe(false);
  });

  it('returns false without roleType', () => {
    expect(shouldResolveRoleFromRoleType({ name: 'x' })).toBe(false);
  });
});
