import { describe, expect, it } from 'vitest';

import {
  DEFAULT_KIOSK_SESSION_IDLE_SECONDS,
  kioskSessionIdleSecondsToMs,
  normalizeKioskSessionIdleSeconds,
} from './kiosk-session-idle';

describe('kiosk session idle', () => {
  it('defaults invalid values to 7 seconds', () => {
    expect(normalizeKioskSessionIdleSeconds(Number.NaN)).toBe(
      DEFAULT_KIOSK_SESSION_IDLE_SECONDS,
    );
  });

  it('clamps values to the allowed range', () => {
    expect(normalizeKioskSessionIdleSeconds(0)).toBe(1);
    expect(normalizeKioskSessionIdleSeconds(5000)).toBe(3600);
  });

  it('converts seconds to milliseconds', () => {
    expect(kioskSessionIdleSecondsToMs(7)).toBe(7000);
  });
});
