import { canManageRole, RoleType } from '../business/roles';

/**
 * Global policy: allow user creation/deactivation only when the actor's role
 * outranks the target role provided in the request body (`data.role` as a role
 * type string). Reference as `global::can-manage-role`.
 */
export default async (policyContext: any, _config: unknown, { strapi }: { strapi: any }) => {
  const user = policyContext.state?.user;
  if (!user) return false;

  const actorRole = (user.role?.type ?? null) as RoleType | null;
  if (!actorRole) {
    const populated = await strapi.documents('plugin::users-permissions.user').findOne({
      documentId: user.documentId,
      populate: { role: true },
    });
    if (!populated?.role?.type) return false;
    return canManageRole(populated.role.type as RoleType, getTargetRole(policyContext));
  }

  return canManageRole(actorRole, getTargetRole(policyContext));
};

function getTargetRole(policyContext: any): RoleType {
  const body = policyContext.request?.body?.data ?? {};
  return (body.roleType ?? body.role ?? 'colaborator') as RoleType;
}
