import { describe, expect, it } from 'vitest';

import { shouldSetTaskStartedAt } from './task-started-at';

describe('shouldSetTaskStartedAt', () => {
  it('sets startedAt when task enters producing without a start time', () => {
    expect(shouldSetTaskStartedAt('producing', null)).toBe(true);
    expect(shouldSetTaskStartedAt('producing', '')).toBe(true);
  });

  it('keeps existing startedAt when already set', () => {
    expect(
      shouldSetTaskStartedAt('producing', '2026-07-07T10:00:00.000Z'),
    ).toBe(false);
  });

  it('does not set startedAt for non-producing statuses', () => {
    expect(shouldSetTaskStartedAt('waiting', null)).toBe(false);
    expect(shouldSetTaskStartedAt('finished', null)).toBe(false);
  });
});
