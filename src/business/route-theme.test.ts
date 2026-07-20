import { describe, expect, it } from 'vitest';

import {
  isRouteThemeKey,
  isValidBackgroundColor,
  ROUTE_THEME_KEYS,
} from './route-theme';

describe('isValidBackgroundColor', () => {
  it('allows empty values', () => {
    expect(isValidBackgroundColor(null)).toBe(true);
    expect(isValidBackgroundColor('')).toBe(true);
  });

  it('accepts hex colors', () => {
    expect(isValidBackgroundColor('#fff')).toBe(true);
    expect(isValidBackgroundColor('#F4F1EA')).toBe(true);
  });

  it('rejects invalid colors', () => {
    expect(isValidBackgroundColor('red')).toBe(false);
    expect(isValidBackgroundColor('#gg0000')).toBe(false);
  });
});

describe('isRouteThemeKey', () => {
  it('accepts seeded keys', () => {
    for (const key of ROUTE_THEME_KEYS) {
      expect(isRouteThemeKey(key)).toBe(true);
    }
  });

  it('rejects unknown keys', () => {
    expect(isRouteThemeKey('unknown')).toBe(false);
  });
});
