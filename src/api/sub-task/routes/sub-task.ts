import { factories } from '@strapi/strapi';

const TEAM_POLICY = 'global::is-owner-or-team-member';

export default factories.createCoreRouter('api::sub-task.sub-task', {
  config: {
    find: { policies: [TEAM_POLICY] },
    findOne: { policies: [TEAM_POLICY] },
  },
});
