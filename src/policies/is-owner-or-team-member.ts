const TEAM_UID = 'api::team.team';

/**
 * Global policy: admin/manager see everything; leader sees only members of
 * teams they lead; colaborator sees only their own teams.
 * Reference as `global::is-owner-or-team-member`.
 */
export default async (policyContext: any, _config: unknown, { strapi }: { strapi: any }) => {
  const user = policyContext.state?.user;
  if (!user) return false;

  const populated = await strapi.documents('plugin::users-permissions.user').findOne({
    documentId: user.documentId,
    populate: { role: true },
  });
  const roleType = populated?.role?.type;
  if (roleType === 'admin' || roleType === 'manager') return true;

  if (roleType === 'leader') {
    const led = await strapi.documents(TEAM_UID).findMany({
      filters: { leader: user.id },
      limit: 1,
    });
    return led.length > 0;
  }

  const member = await strapi.documents(TEAM_UID).findMany({
    filters: { colaborators: user.id },
    limit: 1,
  });
  return member.length > 0;
};
