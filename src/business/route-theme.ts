export const ROUTE_THEME_KEYS = [
  'login',
  'staff-home',
  'board',
  'tasks',
  'templates',
  'teams',
  'awards',
  'users',
  'settings',
  'colaborator',
  'kiosk',
] as const;

export type RouteThemeKey = (typeof ROUTE_THEME_KEYS)[number];

export const ROUTE_THEME_SEED: { routeKey: RouteThemeKey; label: string }[] = [
  { routeKey: 'login', label: 'Login' },
  { routeKey: 'staff-home', label: 'Painel' },
  { routeKey: 'board', label: 'Quadro' },
  { routeKey: 'tasks', label: 'Tarefas' },
  { routeKey: 'templates', label: 'Modelos' },
  { routeKey: 'teams', label: 'Equipes' },
  { routeKey: 'awards', label: 'Prêmios' },
  { routeKey: 'users', label: 'Usuários' },
  { routeKey: 'settings', label: 'Configurações' },
  { routeKey: 'colaborator', label: 'Home do colaborador' },
  { routeKey: 'kiosk', label: 'Totem' },
];

const HEX_COLOR = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;

export function isValidBackgroundColor(
  value: string | null | undefined,
): boolean {
  if (value == null || value === '') return true;
  return HEX_COLOR.test(value);
}

export function isRouteThemeKey(value: string): value is RouteThemeKey {
  return (ROUTE_THEME_KEYS as readonly string[]).includes(value);
}
