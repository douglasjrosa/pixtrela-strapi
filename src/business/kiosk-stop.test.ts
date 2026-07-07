import { describe, expect, it } from 'vitest';

import {
  parseDurationStopBody,
  parseQtyStopBody,
  resolveDurationStop,
  resolveQtyStop,
} from './kiosk-stop';

describe('parseDurationStopBody', () => {
  it('requires completed flag', () => {
    expect(parseDurationStopBody({ completed: true })).toBe(true);
    expect(parseDurationStopBody({ isCompleted: false })).toBe(false);
    expect(() => parseDurationStopBody({})).toThrow('completed required');
  });
});

describe('parseQtyStopBody', () => {
  it('requires positive integer qty', () => {
    expect(parseQtyStopBody({ qty: 2 })).toBe(2);
    expect(() => parseQtyStopBody({})).toThrow('qty required');
  });
});

describe('resolveQtyStop', () => {
  it('finishes when global cumulative qty reaches sub-task qty', () => {
    expect(resolveQtyStop(10, 7, 3)).toEqual({ qty: 3, subTaskStatus: 'finished' });
    expect(resolveQtyStop(10, 7, 2)).toEqual({ qty: 2, subTaskStatus: 'waiting' });
  });

  it('counts qty from every colaborator toward completion', () => {
    expect(resolveQtyStop(5, 3, 2)).toEqual({ qty: 2, subTaskStatus: 'finished' });
  });

  it('rejects qty above remaining pieces', () => {
    expect(() => resolveQtyStop(10, 7, 4)).toThrow('qty exceeds sub-task quantity');
    expect(() => resolveQtyStop(10, 0, 11)).toThrow('qty exceeds sub-task quantity');
  });
});

describe('resolveDurationStop', () => {
  it('returns finished or queued based on reported completion', () => {
    expect(resolveDurationStop(true)).toEqual({ qty: 0, subTaskStatus: 'finished' });
    expect(resolveDurationStop(false)).toEqual({ qty: 0, subTaskStatus: 'waiting' });
  });
});
