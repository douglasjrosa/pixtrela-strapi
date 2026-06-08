import { isExchangeWindowOpen } from '../business/exchange';
import { ACTIVE_TEAM_FILTER } from '../business/team-active';

const TEAM_UID = 'api::team.team';

/**
 * Global policy: allow only when the authenticated colaborator's team is
 * within its monthly exchange window. Reference as `global::exchange-window-open`.
 */
export default async (policyContext: any, _config: unknown, { strapi }: { strapi: any }) => {
  const user = policyContext.state?.user;
  if (!user) return false;

  const [team] = await strapi.documents(TEAM_UID).findMany({
    filters: { ...ACTIVE_TEAM_FILTER, colaborators: user.id },
    limit: 1,
  });
  if (!team) return false;

  return isExchangeWindowOpen(team, new Date());
};
