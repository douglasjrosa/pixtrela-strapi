import { ensureLocalProvider } from '../../../../business/user-auth';
import { isAppRoleType } from '../../../../business/user-role';
import { shouldResolveRoleFromRoleType } from '../../../../business/user-role-sync';

async function syncRoleFromRoleType(data: Record<string, unknown>) {
  if (!shouldResolveRoleFromRoleType(data)) return;

  const roleType = data.roleType;
  if (typeof roleType !== 'string' || !isAppRoleType(roleType)) return;

  const role = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: roleType },
  });
  if (role?.id) {
    data.role = role.id;
  }
}

async function syncRoleType(data: Record<string, unknown>) {
  if (!Object.prototype.hasOwnProperty.call(data, 'role')) return;

  const roleRef = data.role;
  if (roleRef === null || roleRef === undefined) return;

  if (typeof roleRef === 'number') {
    const role = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { id: roleRef },
    });
    if (role?.type && isAppRoleType(role.type)) {
      data.roleType = role.type;
    }
    return;
  }

  if (typeof roleRef !== 'object') return;

  const relation = roleRef as Record<string, unknown>;
  if (typeof relation.id === 'number') {
    const role = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { id: relation.id },
    });
    if (role?.type && isAppRoleType(role.type)) {
      data.roleType = role.type;
    }
    return;
  }

  const connect = relation.connect ?? relation.set;
  const documentId =
    typeof connect === 'string'
      ? connect
      : Array.isArray(connect) && typeof connect[0] === 'string'
        ? connect[0]
        : null;

  if (!documentId) return;

  const role = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { documentId },
  });
  if (role?.type && isAppRoleType(role.type)) {
    data.roleType = role.type;
  }
}

export default {
  async beforeCreate(event: { params: { data: Record<string, unknown> } }) {
    ensureLocalProvider(event.params.data);
    await syncRoleFromRoleType(event.params.data);
    await syncRoleType(event.params.data);
  },

  async beforeUpdate(event: { params: { data: Record<string, unknown> } }) {
    ensureLocalProvider(event.params.data);
    await syncRoleFromRoleType(event.params.data);
    await syncRoleType(event.params.data);
  },
};
