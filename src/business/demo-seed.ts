/**
 * Demo / first-install seed catalog.
 * All sample records use the [Demo] prefix (or demo-* usernames) so they are
 * easy to find, edit, or delete after install.
 */

export const DEMO_PASSWORD = 'PixtrelaDemo1';
export const DEMO_NAME_PREFIX = '[Demo]';

export type DemoRoleType =
  | 'admin'
  | 'manager'
  | 'leader'
  | 'colaborator'
  | 'kiosk';

export interface DemoUserSeed {
  username: string;
  email: string;
  name: string;
  roleType: DemoRoleType;
  code?: number;
  greetingGender?: 'masculine' | 'feminine';
}

export interface DemoStepSeed {
  name: string;
  index: number;
  /** Task status this step maps to in automation (optional for extras). */
  statusKey?:
    | 'waiting'
    | 'producing'
    | 'paused'
    | 'finished'
    | 'reviewed'
    | 'delivered';
}

export interface DemoPresetSeed {
  name: string;
  sharingType: 'qty' | 'duration';
  maxSameTimeWorkers: number;
  expectedTime: number;
}

export interface DemoTemplateSubTaskSeed {
  name: string;
  qty: number;
  sharingType: 'qty' | 'duration';
  maxSameTimeWorkers: number;
  index: number;
  expectedTime: number;
}

export interface DemoTemplateSeed {
  name: string;
  code: string;
  subTasks: DemoTemplateSubTaskSeed[];
}

export interface DemoAwardSeed {
  name: string;
  title: string;
  description: string;
  stars: number;
}

export interface DemoTeamSeed {
  name: string;
  leaderUsername: string;
  colaboratorUsernames: string[];
  exchangesFirstDay: number;
  exchangesLastDay: number;
}

export interface DemoSubTaskSeed {
  name: string;
  index: number;
  qty: number;
  sharingType: 'qty' | 'duration';
  maxSameTimeWorkers: number;
  expectedTime: number;
  status: 'waiting' | 'producing' | 'paused' | 'finished';
  activationStatus: 'locked' | 'unlocked' | 'disabled';
  assigneeUsernames: string[];
}

export interface DemoTaskSeed {
  name: string;
  qty: number;
  status: 'waiting' | 'producing' | 'paused' | 'finished' | 'reviewed' | 'delivered';
  index: number;
  subTasks: DemoSubTaskSeed[];
}

export interface DemoBalanceSeed {
  username: string;
  previousBalance: number;
  totalIncome: number;
  totalOutcome: number;
}

export const DEMO_CURRENCY = {
  name: 'star',
  title: 'Estrela',
  pluralTitle: 'Estrelas',
  currencyPerSecond: 1,
} as const;

export const DEMO_STEPS: DemoStepSeed[] = [
  { name: 'Fila de produção', index: 1, statusKey: 'waiting' },
  { name: 'Produzindo', index: 2, statusKey: 'producing' },
  { name: 'Pausado', index: 3, statusKey: 'paused' },
  { name: 'Finalizado', index: 4, statusKey: 'finished' },
  { name: 'Revisado', index: 5, statusKey: 'reviewed' },
  { name: 'Entregue', index: 6, statusKey: 'delivered' },
];

export const DEMO_USERS: DemoUserSeed[] = [
  {
    username: 'demo-admin',
    email: 'demo-admin@pixtrela.local',
    name: `${DEMO_NAME_PREFIX} Admin`,
    roleType: 'admin',
  },
  {
    username: 'demo-manager',
    email: 'demo-manager@pixtrela.local',
    name: `${DEMO_NAME_PREFIX} Gerente`,
    roleType: 'manager',
  },
  {
    username: 'demo-leader',
    email: 'demo-leader@pixtrela.local',
    name: `${DEMO_NAME_PREFIX} Líder`,
    roleType: 'leader',
  },
  {
    username: 'demo-ana',
    email: 'demo-ana@pixtrela.local',
    name: `${DEMO_NAME_PREFIX} Ana Silva`,
    roleType: 'colaborator',
    code: 1001,
    greetingGender: 'feminine',
  },
  {
    username: 'demo-bruno',
    email: 'demo-bruno@pixtrela.local',
    name: `${DEMO_NAME_PREFIX} Bruno Costa`,
    roleType: 'colaborator',
    code: 1002,
    greetingGender: 'masculine',
  },
  {
    username: 'demo-carla',
    email: 'demo-carla@pixtrela.local',
    name: `${DEMO_NAME_PREFIX} Carla Souza`,
    roleType: 'colaborator',
    code: 1003,
    greetingGender: 'feminine',
  },
  {
    username: 'demo-kiosk',
    email: 'demo-kiosk@pixtrela.local',
    name: `${DEMO_NAME_PREFIX} Totem`,
    roleType: 'kiosk',
  },
];

export const DEMO_TEAMS: DemoTeamSeed[] = [
  {
    name: `${DEMO_NAME_PREFIX} Montagem`,
    leaderUsername: 'demo-leader',
    colaboratorUsernames: ['demo-ana', 'demo-bruno'],
    exchangesFirstDay: 1,
    exchangesLastDay: 31,
  },
  {
    name: `${DEMO_NAME_PREFIX} Acabamento`,
    leaderUsername: 'demo-leader',
    colaboratorUsernames: ['demo-carla'],
    exchangesFirstDay: 1,
    exchangesLastDay: 31,
  },
];

export const DEMO_PRESETS: DemoPresetSeed[] = [
  {
    name: `${DEMO_NAME_PREFIX} Corte`,
    sharingType: 'qty',
    maxSameTimeWorkers: 2,
    expectedTime: 600,
  },
  {
    name: `${DEMO_NAME_PREFIX} Solda`,
    sharingType: 'duration',
    maxSameTimeWorkers: 1,
    expectedTime: 900,
  },
  {
    name: `${DEMO_NAME_PREFIX} Pintura`,
    sharingType: 'duration',
    maxSameTimeWorkers: 2,
    expectedTime: 1200,
  },
  {
    name: `${DEMO_NAME_PREFIX} Montagem`,
    sharingType: 'qty',
    maxSameTimeWorkers: 2,
    expectedTime: 1800,
  },
  {
    name: `${DEMO_NAME_PREFIX} Embalagem`,
    sharingType: 'qty',
    maxSameTimeWorkers: 1,
    expectedTime: 300,
  },
  {
    name: `${DEMO_NAME_PREFIX} Inspeção`,
    sharingType: 'duration',
    maxSameTimeWorkers: 1,
    expectedTime: 480,
  },
];

export const DEMO_TEMPLATES: DemoTemplateSeed[] = [
  {
    name: `${DEMO_NAME_PREFIX} Caixa Industrial`,
    code: 'DEMO-CAIXA-IND',
    subTasks: [
      {
        name: 'Corte',
        qty: 1,
        sharingType: 'qty',
        maxSameTimeWorkers: 2,
        index: 0,
        expectedTime: 600,
      },
      {
        name: 'Solda',
        qty: 1,
        sharingType: 'duration',
        maxSameTimeWorkers: 1,
        index: 1,
        expectedTime: 900,
      },
      {
        name: 'Pintura',
        qty: 1,
        sharingType: 'duration',
        maxSameTimeWorkers: 2,
        index: 2,
        expectedTime: 1200,
      },
      {
        name: 'Montagem',
        qty: 1,
        sharingType: 'qty',
        maxSameTimeWorkers: 2,
        index: 3,
        expectedTime: 1800,
      },
      {
        name: 'Embalagem',
        qty: 1,
        sharingType: 'qty',
        maxSameTimeWorkers: 1,
        index: 4,
        expectedTime: 300,
      },
    ],
  },
  {
    name: `${DEMO_NAME_PREFIX} Kit Simples`,
    code: 'DEMO-KIT-SIMPLES',
    subTasks: [
      {
        name: 'Preparação',
        qty: 1,
        sharingType: 'duration',
        maxSameTimeWorkers: 1,
        index: 0,
        expectedTime: 300,
      },
      {
        name: 'Montagem rápida',
        qty: 2,
        sharingType: 'qty',
        maxSameTimeWorkers: 2,
        index: 1,
        expectedTime: 600,
      },
      {
        name: 'Conferência',
        qty: 1,
        sharingType: 'duration',
        maxSameTimeWorkers: 1,
        index: 2,
        expectedTime: 180,
      },
    ],
  },
];

export const DEMO_AWARDS: DemoAwardSeed[] = [
  {
    name: `${DEMO_NAME_PREFIX} Arroz 5kg`,
    title: 'Arroz 5kg',
    description: 'Pacote de arroz tipo 1 — prêmio de demonstração.',
    stars: 500,
  },
  {
    name: `${DEMO_NAME_PREFIX} Feijão 1kg`,
    title: 'Feijão 1kg',
    description: 'Pacote de feijão carioca — prêmio de demonstração.',
    stars: 200,
  },
  {
    name: `${DEMO_NAME_PREFIX} Açúcar 1kg`,
    title: 'Açúcar 1kg',
    description: 'Pacote de açúcar cristal — prêmio de demonstração.',
    stars: 150,
  },
  {
    name: `${DEMO_NAME_PREFIX} Óleo 900ml`,
    title: 'Óleo 900ml',
    description: 'Garrafa de óleo de soja — prêmio de demonstração.',
    stars: 180,
  },
  {
    name: `${DEMO_NAME_PREFIX} Café 500g`,
    title: 'Café 500g',
    description: 'Pacote de café torrado — prêmio de demonstração.',
    stars: 350,
  },
];

/** Sample board tasks (qty=1 so expectedTime is not scaled by middleware). */
export const DEMO_TASKS: DemoTaskSeed[] = [
  {
    name: `${DEMO_NAME_PREFIX} Pedido A — Fila`,
    qty: 1,
    status: 'waiting',
    index: 0,
    subTasks: [
      {
        name: 'Corte',
        index: 0,
        qty: 1,
        sharingType: 'qty',
        maxSameTimeWorkers: 2,
        expectedTime: 600,
        status: 'waiting',
        activationStatus: 'unlocked',
        assigneeUsernames: ['demo-ana', 'demo-bruno'],
      },
      {
        name: 'Solda',
        index: 1,
        qty: 1,
        sharingType: 'duration',
        maxSameTimeWorkers: 1,
        expectedTime: 900,
        status: 'waiting',
        activationStatus: 'locked',
        assigneeUsernames: ['demo-bruno'],
      },
      {
        name: 'Embalagem',
        index: 2,
        qty: 1,
        sharingType: 'qty',
        maxSameTimeWorkers: 1,
        expectedTime: 300,
        status: 'waiting',
        activationStatus: 'locked',
        assigneeUsernames: ['demo-ana'],
      },
    ],
  },
  {
    name: `${DEMO_NAME_PREFIX} Pedido B — Em produção`,
    qty: 1,
    status: 'producing',
    index: 1,
    subTasks: [
      {
        name: 'Pintura',
        index: 0,
        qty: 1,
        sharingType: 'duration',
        maxSameTimeWorkers: 2,
        expectedTime: 1200,
        status: 'producing',
        activationStatus: 'unlocked',
        assigneeUsernames: ['demo-carla'],
      },
      {
        name: 'Inspeção',
        index: 1,
        qty: 1,
        sharingType: 'duration',
        maxSameTimeWorkers: 1,
        expectedTime: 480,
        status: 'waiting',
        activationStatus: 'locked',
        assigneeUsernames: ['demo-carla'],
      },
    ],
  },
  {
    name: `${DEMO_NAME_PREFIX} Pedido C — Pausado`,
    qty: 1,
    status: 'paused',
    index: 2,
    subTasks: [
      {
        name: 'Montagem',
        index: 0,
        qty: 2,
        sharingType: 'qty',
        maxSameTimeWorkers: 2,
        expectedTime: 1800,
        status: 'paused',
        activationStatus: 'unlocked',
        assigneeUsernames: ['demo-ana', 'demo-bruno'],
      },
    ],
  },
  {
    name: `${DEMO_NAME_PREFIX} Pedido D — Finalizado`,
    qty: 1,
    status: 'finished',
    index: 3,
    subTasks: [
      {
        name: 'Preparação',
        index: 0,
        qty: 1,
        sharingType: 'duration',
        maxSameTimeWorkers: 1,
        expectedTime: 300,
        status: 'finished',
        activationStatus: 'unlocked',
        assigneeUsernames: ['demo-ana'],
      },
      {
        name: 'Conferência',
        index: 1,
        qty: 1,
        sharingType: 'duration',
        maxSameTimeWorkers: 1,
        expectedTime: 180,
        status: 'finished',
        activationStatus: 'unlocked',
        assigneeUsernames: ['demo-bruno'],
      },
    ],
  },
];

export const DEMO_BALANCES: DemoBalanceSeed[] = [
  {
    username: 'demo-ana',
    previousBalance: 100,
    totalIncome: 420,
    totalOutcome: 0,
  },
  {
    username: 'demo-bruno',
    previousBalance: 50,
    totalIncome: 310,
    totalOutcome: 150,
  },
  {
    username: 'demo-carla',
    previousBalance: 0,
    totalIncome: 580,
    totalOutcome: 200,
  },
];

export const DEMO_ROUTE_THEME_COLORS: Partial<
  Record<string, { backgroundColor: string; surfaceColor: string }>
> = {
  login: { backgroundColor: '#0f172a', surfaceColor: '#1e293b' },
  board: { backgroundColor: '#f1f5f9', surfaceColor: '#ffffff' },
  kiosk: { backgroundColor: '#0b1220', surfaceColor: '#111827' },
  colaborator: { backgroundColor: '#fff7ed', surfaceColor: '#ffffff' },
  settings: { backgroundColor: '#f8fafc', surfaceColor: '#ffffff' },
};

/** Pure helpers used by seed orchestration and unit tests. */

export function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

export function demoUsernames(): string[] {
  return DEMO_USERS.map((user) => user.username);
}

export function demoColaboratorCodes(): number[] {
  return DEMO_USERS.filter((user) => user.code != null).map(
    (user) => user.code as number,
  );
}

export function recomputeDemoBalance(seed: DemoBalanceSeed): number {
  return seed.previousBalance + seed.totalIncome - seed.totalOutcome;
}

export function findStepNameForStatus(
  statusKey: NonNullable<DemoStepSeed['statusKey']>,
): string | undefined {
  return DEMO_STEPS.find((step) => step.statusKey === statusKey)?.name;
}

export function buildDemoCredentialsSummary(): string {
  const lines = DEMO_USERS.map((user) => {
    const codePart = user.code != null ? ` | code ${user.code}` : '';
    return `  ${user.username} (${user.roleType})${codePart}`;
  });
  return [
    'Demo login (password for all demo users):',
    `  ${DEMO_PASSWORD}`,
    'Users:',
    ...lines,
  ].join('\n');
}
