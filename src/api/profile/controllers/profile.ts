const PROFILE_SERVICE = 'api::profile.profile';

function readActorId(ctx: { state: { user?: { id?: number } } }): number | null {
  const userId = ctx.state.user?.id;
  return typeof userId === 'number' ? userId : null;
}

export default {
  async updateAvatar(ctx) {
    const actorId = readActorId(ctx);
    if (!actorId) return ctx.unauthorized();

    const parsed = strapi.service(PROFILE_SERVICE).parseBody(ctx.request.body);
    if (parsed.ok === false) {
      return ctx.badRequest('Invalid avatar payload');
    }

    try {
      const buffer = Buffer.from(parsed.fileBase64, 'base64');
      const result = await strapi
        .service(PROFILE_SERVICE)
        .updateOwnAvatar(actorId, buffer, parsed.mimeType, parsed.fileName);
      ctx.body = { ok: true, avatarUrl: result.avatarUrl };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'error';
      if (message === 'forbidden') return ctx.forbidden();
      if (message === 'notFound') return ctx.notFound();
      if (
        message === 'invalidType' ||
        message === 'tooLarge' ||
        message === 'empty' ||
        message.startsWith('uploadFailed')
      ) {
        return ctx.badRequest(message);
      }
      return ctx.badRequest(message);
    }
  },

  async updatePersonal(ctx) {
    const actorId = readActorId(ctx);
    if (!actorId) return ctx.unauthorized();

    const parsed = strapi
      .service(PROFILE_SERVICE)
      .parsePersonalBody(ctx.request.body);
    if (parsed.ok === false) {
      return ctx.badRequest(parsed.error);
    }

    try {
      const result = await strapi
        .service(PROFILE_SERVICE)
        .updateOwnPersonal(actorId, parsed.data);
      ctx.body = { ok: true, ...result };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'error';
      if (message === 'forbidden') return ctx.forbidden();
      if (message === 'notFound') return ctx.notFound();
      if (message === 'emailTaken') return ctx.badRequest('emailTaken');
      return ctx.badRequest(message);
    }
  },
};
