import { prepareUserWriteBody } from '../../business/user-create-body';

type RouteConfig = {
  handler?: string;
  config?: { policies?: string[] };
};

type PluginController = {
  create: (ctx: unknown) => Promise<void>;
  update: (ctx: unknown) => Promise<void>;
};

type RequestCtx = {
  request: { body: Record<string, unknown> };
};

function appendPolicy(route: RouteConfig, policy: string): void {
  if (!route.handler) return;
  route.config = route.config ?? {};
  const existing = route.config.policies ?? [];
  if (existing.includes(policy)) return;
  route.config.policies = [...existing, policy];
}

/** Extends users-permissions: RBAC policies + Pixtrela user create/update body. */
export default (plugin: {
  routes: Record<string, { routes: RouteConfig[] }>;
  controllers: { user: PluginController };
}) => {
  const routes = plugin.routes['content-api']?.routes ?? [];
  for (const route of routes) {
    if (route.handler === 'user.create' || route.handler === 'user.update') {
      appendPolicy(route, 'global::can-manage-role');
    }
    if (
      route.handler === 'user.find' ||
      route.handler === 'user.findOne' ||
      route.handler === 'user.count'
    ) {
      appendPolicy(route, 'global::is-owner-or-team-member');
    }
  }

  const originalCreate = plugin.controllers.user.create.bind(plugin.controllers.user);
  plugin.controllers.user.create = async (ctx: RequestCtx) => {
    ctx.request.body = await prepareUserWriteBody(ctx.request.body ?? {});
    return originalCreate(ctx);
  };

  const originalUpdate = plugin.controllers.user.update.bind(plugin.controllers.user);
  plugin.controllers.user.update = async (ctx: RequestCtx) => {
    ctx.request.body = await prepareUserWriteBody(ctx.request.body ?? {});
    return originalUpdate(ctx);
  };

  return plugin;
};
