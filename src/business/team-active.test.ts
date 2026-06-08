import { describe, expect, it } from 'vitest';

import { isTeamActive } from './team-active';

describe('isTeamActive', () => {
  it('returns true when untill is empty', () => {
    expect(isTeamActive(null)).toBe(true);
    expect(isTeamActive(undefined)).toBe(true);
  });

  it('returns false when untill has a date', () => {
    expect(isTeamActive('2026-06-01')).toBe(false);
    expect(isTeamActive(new Date('2026-06-01'))).toBe(false);
  });
});
