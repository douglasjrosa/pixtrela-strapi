import { describe, expect, it } from 'vitest';

import {
  canStaffSetColaboratorPassword,
  filterColaboratorsForStaffRole,
  parseKioskColaboratorPasswordBody,
  type KioskColaboratorRow,
} from './kiosk-staff-colaborators';

const COLABORATORS: KioskColaboratorRow[] = [
  { documentId: 'c1', name: 'Ana', code: 1001 },
  { documentId: 'c2', name: 'Bruno', code: 1002 },
];

describe('filterColaboratorsForStaffRole', () => {
  it('returns all colaborators for admin and manager', () => {
    expect(filterColaboratorsForStaffRole('admin', COLABORATORS, new Set())).toEqual(
      COLABORATORS,
    );
    expect(filterColaboratorsForStaffRole('manager', COLABORATORS, new Set())).toEqual(
      COLABORATORS,
    );
  });

  it('returns only team colaborators for leader', () => {
    const filtered = filterColaboratorsForStaffRole(
      'leader',
      COLABORATORS,
      new Set(['c2']),
    );
    expect(filtered).toEqual([COLABORATORS[1]]);
  });
});

describe('canStaffSetColaboratorPassword', () => {
  it('allows admin and manager for any colaborator', () => {
    expect(
      canStaffSetColaboratorPassword('admin', true, new Set(), 'c1'),
    ).toBe(true);
    expect(
      canStaffSetColaboratorPassword('manager', true, new Set(), 'c1'),
    ).toBe(true);
  });

  it('allows leader only for team colaborators', () => {
    const teamIds = new Set(['c2']);
    expect(
      canStaffSetColaboratorPassword('leader', true, teamIds, 'c2'),
    ).toBe(true);
    expect(
      canStaffSetColaboratorPassword('leader', true, teamIds, 'c1'),
    ).toBe(false);
  });

  it('rejects non-colaborator targets', () => {
    expect(
      canStaffSetColaboratorPassword('admin', false, new Set(), 'c1'),
    ).toBe(false);
  });
});

describe('parseKioskColaboratorPasswordBody', () => {
  it('accepts valid password payloads', () => {
    expect(parseKioskColaboratorPasswordBody({ password: 'secret1' })).toEqual({
      ok: true,
      password: 'secret1',
    });
    expect(
      parseKioskColaboratorPasswordBody({ data: { password: 'secret1' } }),
    ).toEqual({
      ok: true,
      password: 'secret1',
    });
  });

  it('rejects invalid payloads', () => {
    expect(parseKioskColaboratorPasswordBody(null).ok).toBe(false);
    expect(parseKioskColaboratorPasswordBody({ password: '123' }).ok).toBe(false);
  });
});
