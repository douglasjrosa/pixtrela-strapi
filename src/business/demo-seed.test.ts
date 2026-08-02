import { describe, expect, it } from 'vitest';

import {
  DEMO_AWARDS,
  DEMO_BALANCES,
  DEMO_NAME_PREFIX,
  DEMO_PASSWORD,
  DEMO_PRESETS,
  DEMO_STEPS,
  DEMO_TASKS,
  DEMO_TEAMS,
  DEMO_TEMPLATES,
  DEMO_USERS,
  buildDemoCredentialsSummary,
  demoColaboratorCodes,
  demoUsernames,
  findStepNameForStatus,
  recomputeDemoBalance,
  uniqueStrings,
} from './demo-seed';

describe('demo-seed catalog', () => {
  it('uses a password with at least 6 characters', () => {
    expect(DEMO_PASSWORD.length).toBeGreaterThanOrEqual(6);
  });

  it('has unique usernames and colaborator codes', () => {
    const usernames = demoUsernames();
    expect(uniqueStrings(usernames)).toEqual(usernames);

    const codes = demoColaboratorCodes();
    expect(uniqueStrings(codes.map(String))).toEqual(codes.map(String));
  });

  it('covers every app role at least once', () => {
    const roles = new Set(DEMO_USERS.map((user) => user.roleType));
    expect(roles).toEqual(
      new Set(['admin', 'manager', 'leader', 'colaborator', 'kiosk']),
    );
  });

  it('maps every task status to a unique step index', () => {
    const withStatus = DEMO_STEPS.filter((step) => step.statusKey);
    const keys = withStatus.map((step) => step.statusKey);
    expect(uniqueStrings(keys as string[])).toHaveLength(6);
    expect(findStepNameForStatus('waiting')).toBe('Fila de produção');
    expect(findStepNameForStatus('delivered')).toBe('Entregue');
  });

  it('prefixes demo catalog names for easy cleanup', () => {
    for (const award of DEMO_AWARDS) {
      expect(award.name.startsWith(DEMO_NAME_PREFIX)).toBe(true);
      expect(award.stars).toBeGreaterThan(0);
    }
    for (const team of DEMO_TEAMS) {
      expect(team.name.startsWith(DEMO_NAME_PREFIX)).toBe(true);
    }
    for (const preset of DEMO_PRESETS) {
      expect(preset.name.startsWith(DEMO_NAME_PREFIX)).toBe(true);
      expect(preset.expectedTime).toBeGreaterThan(0);
    }
    for (const template of DEMO_TEMPLATES) {
      expect(template.name.startsWith(DEMO_NAME_PREFIX)).toBe(true);
      expect(template.code.startsWith('DEMO-')).toBe(true);
      expect(template.subTasks.length).toBeGreaterThan(0);
    }
    for (const task of DEMO_TASKS) {
      expect(task.name.startsWith(DEMO_NAME_PREFIX)).toBe(true);
      expect(task.qty).toBe(1);
      expect(task.subTasks.length).toBeGreaterThan(0);
    }
  });

  it('references only known usernames in teams and tasks', () => {
    const known = new Set(demoUsernames());
    for (const team of DEMO_TEAMS) {
      expect(known.has(team.leaderUsername)).toBe(true);
      for (const username of team.colaboratorUsernames) {
        expect(known.has(username)).toBe(true);
      }
    }
    for (const task of DEMO_TASKS) {
      for (const subTask of task.subTasks) {
        for (const username of subTask.assigneeUsernames) {
          expect(known.has(username)).toBe(true);
        }
      }
    }
  });

  it('computes demo balances as previous + income - outcome', () => {
    for (const balance of DEMO_BALANCES) {
      expect(recomputeDemoBalance(balance)).toBe(
        balance.previousBalance + balance.totalIncome - balance.totalOutcome,
      );
    }
  });

  it('builds a credentials summary for the console', () => {
    const summary = buildDemoCredentialsSummary();
    expect(summary).toContain(DEMO_PASSWORD);
    expect(summary).toContain('demo-admin');
    expect(summary).toContain('demo-kiosk');
  });
});
