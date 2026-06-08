import { factories } from '@strapi/strapi';

const TEAM_POLICY = 'global::is-owner-or-team-member';

export default factories.createCoreRouter('api::team.team', {
  config: {
    find: { policies: [TEAM_POLICY] },
    findOne: { policies: [TEAM_POLICY] },
  },
});
