const DASHBOARD_SERVICE = 'api::dashboard.dashboard';

function readActorId(ctx: { state: { user?: { id?: number } } }): number | null {
  const userId = ctx.state.user?.id;
  return typeof userId === 'number' ? userId : null;
}

export default {
  async monthlyRanking(ctx) {
    const actorId = readActorId(ctx);
    if (!actorId) return ctx.unauthorized();

    try {
      const data = await strapi.service(DASHBOARD_SERVICE).monthlyRanking(actorId);
      return { data };
    } catch (error) {
      if (error instanceof Error && error.message === 'forbidden') {
        return ctx.forbidden();
      }
      throw error;
    }
  },

  async listColaborators(ctx) {
    const actorId = readActorId(ctx);
    if (!actorId) return ctx.unauthorized();

    try {
      const data = await strapi.service(DASHBOARD_SERVICE).listColaborators(actorId);
      return { data };
    } catch (error) {
      if (error instanceof Error && error.message === 'forbidden') {
        return ctx.forbidden();
      }
      throw error;
    }
  },

  async colaboratorInsights(ctx) {
    const actorId = readActorId(ctx);
    if (!actorId) return ctx.unauthorized();

    const colaboratorDocumentId = String(ctx.params.documentId ?? '');
    if (!colaboratorDocumentId) return ctx.badRequest('missing colaborator');

    try {
      const data = await strapi
        .service(DASHBOARD_SERVICE)
        .colaboratorInsights(actorId, colaboratorDocumentId, ctx.query.month);
      return { data };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'forbidden') return ctx.forbidden();
        if (error.message === 'not_found') return ctx.notFound();
      }
      throw error;
    }
  },
};
