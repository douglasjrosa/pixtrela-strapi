import { describe, it, expect } from 'vitest';
import { canManageRole, canDeleteUsers } from './roles';

describe('canManageRole', () => {
  it('lets admin manage every lower role including kiosk', () => {
    expect(canManageRole('admin', 'manager')).toBe(true);
    expect(canManageRole('admin', 'colaborator')).toBe(true);
    expect(canManageRole('admin', 'kiosk')).toBe(true);
  });

  it('does not let non-admin roles manage kiosk', () => {
    expect(canManageRole('manager', 'kiosk')).toBe(false);
    expect(canManageRole('leader', 'kiosk')).toBe(false);
  });

  it('does not let kiosk manage anyone', () => {
    expect(canManageRole('kiosk', 'colaborator')).toBe(false);
  });

  it('lets manager manage leader and colaborator only', () => {
    expect(canManageRole('manager', 'leader')).toBe(true);
    expect(canManageRole('manager', 'manager')).toBe(false);
  });

  it('lets leader manage colaborator only', () => {
    expect(canManageRole('leader', 'colaborator')).toBe(true);
    expect(canManageRole('leader', 'leader')).toBe(false);
  });

  it('does not let colaborator manage anyone', () => {
    expect(canManageRole('colaborator', 'colaborator')).toBe(false);
  });
});

describe('canDeleteUsers', () => {
  it('only admin can delete users', () => {
    expect(canDeleteUsers('admin')).toBe(true);
    expect(canDeleteUsers('manager')).toBe(false);
  });
});
