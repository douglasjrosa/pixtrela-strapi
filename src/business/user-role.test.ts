import { describe, expect, it } from 'vitest';

import { isAppRoleType, normalizeRoleType } from './user-role';

describe('normalizeRoleType', () => {
  it('accepts app role values', () => {
    expect(normalizeRoleType('manager')).toBe('manager');
  });

  it('rejects unknown roles', () => {
    expect(normalizeRoleType('authenticated')).toBeNull();
  });
});

describe('isAppRoleType', () => {
  it('validates pixtrela roles only', () => {
    expect(isAppRoleType('admin')).toBe(true);
    expect(isAppRoleType('public')).toBe(false);
  });
});
