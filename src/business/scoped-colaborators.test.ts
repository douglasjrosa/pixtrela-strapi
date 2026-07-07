import { describe, expect, it } from 'vitest';

import {
  canViewColaboratorInsights,
  filterColaboratorsForActor,
  filterRankingColaborators,
  type ScopedColaborator,
} from './scoped-colaborators';

const COLABORATORS: ScopedColaborator[] = [
  { documentId: 'c1', name: 'Ana', code: 1 },
  { documentId: 'c2', name: 'Bia', code: 2 },
  { documentId: 'c3', name: 'Caio', code: 3 },
];

const TEAM_IDS = new Set(['c1', 'c2']);

describe('filterColaboratorsForActor', () => {
  it('returns all colaborators for admin and manager', () => {
    expect(filterColaboratorsForActor('admin', COLABORATORS, TEAM_IDS)).toEqual(
      COLABORATORS,
    );
    expect(filterColaboratorsForActor('manager', COLABORATORS, TEAM_IDS)).toEqual(
      COLABORATORS,
    );
  });

  it('returns only team colaborators for leader', () => {
    expect(filterColaboratorsForActor('leader', COLABORATORS, TEAM_IDS)).toEqual([
      COLABORATORS[0],
      COLABORATORS[1],
    ]);
  });

  it('returns empty list for colaborator', () => {
    expect(filterColaboratorsForActor('colaborator', COLABORATORS, TEAM_IDS)).toEqual(
      [],
    );
  });
});

describe('filterRankingColaborators', () => {
  it('scopes leader ranking to their team', () => {
    expect(filterRankingColaborators('leader', COLABORATORS, TEAM_IDS)).toEqual([
      COLABORATORS[0],
      COLABORATORS[1],
    ]);
  });

  it('keeps all colaborators for admin, manager and colaborator viewers', () => {
    expect(filterRankingColaborators('admin', COLABORATORS, TEAM_IDS)).toEqual(
      COLABORATORS,
    );
    expect(filterRankingColaborators('colaborator', COLABORATORS, TEAM_IDS)).toEqual(
      COLABORATORS,
    );
  });
});

describe('canViewColaboratorInsights', () => {
  it('allows admin and manager to view any colaborator', () => {
    expect(canViewColaboratorInsights('admin', 'a1', 'c3', TEAM_IDS)).toBe(true);
    expect(canViewColaboratorInsights('manager', 'm1', 'c3', TEAM_IDS)).toBe(true);
  });

  it('allows leader only for team members', () => {
    expect(canViewColaboratorInsights('leader', 'l1', 'c1', TEAM_IDS)).toBe(true);
    expect(canViewColaboratorInsights('leader', 'l1', 'c3', TEAM_IDS)).toBe(false);
  });

  it('allows colaborator only for self', () => {
    expect(canViewColaboratorInsights('colaborator', 'c1', 'c1', TEAM_IDS)).toBe(true);
    expect(canViewColaboratorInsights('colaborator', 'c1', 'c2', TEAM_IDS)).toBe(false);
  });
});
