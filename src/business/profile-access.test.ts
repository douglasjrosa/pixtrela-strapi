import { describe, expect, it } from 'vitest';

import { canEditOwnProfile } from './profile-access';

describe('canEditOwnProfile', () => {
  it('allows colaborator, leader and manager', () => {
    expect(canEditOwnProfile('colaborator')).toBe(true);
    expect(canEditOwnProfile('leader')).toBe(true);
    expect(canEditOwnProfile('manager')).toBe(true);
  });

  it('denies admin, kiosk and unknown roles', () => {
    expect(canEditOwnProfile('admin')).toBe(false);
    expect(canEditOwnProfile('kiosk')).toBe(false);
    expect(canEditOwnProfile(undefined)).toBe(false);
    expect(canEditOwnProfile(null)).toBe(false);
  });
});
