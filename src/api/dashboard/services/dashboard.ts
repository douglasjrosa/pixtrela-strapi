import type { DashboardActorRole } from '../../../business/scoped-colaborators';
import {
  aggregateDailyIncomeFromActivities,
  buildMonthlyRankingRows,
  buildPreviousMonthsSummary,
} from '../../../business/dashboard-insights';
import { firstDayOfMonth } from '../../../business/balance';
import {
  canViewColaboratorInsights,
  filterColaboratorsForActor,
  filterRankingColaborators,
  type ScopedColaborator,
} from '../../../business/scoped-colaborators';

const USER_UID = 'plugin::users-permissions.user';
const TEAM_UID = 'api::team.team';
const BALANCE_UID = 'api::balance.balance';
const CURRENCY_UID = 'api::currency.currency';
const ACTIVITY_UID = 'api::activity.activity';
const USERS_TABLE = 'up_users';

type Actor = {
  id: number;
  documentId: string;
  roleType: DashboardActorRole;
};

function readDocumentId(row: {
  documentId?: string;
  document_id?: string;
}): string {
  return String(row.documentId ?? row.document_id ?? '');
}

async function resolveActor(userId: number): Promise<Actor | null> {
  const knex = strapi.db.connection;
  const rows = (await knex(USERS_TABLE)
    .where({ id: userId })
    .select('id', 'document_id', 'role_type')) as Array<{
    id?: number;
    document_id?: string;
    role_type?: string;
  }>;

  const row = rows[0];
  if (!row?.id) return null;

  const roleType = String(row.role_type ?? '') as DashboardActorRole;
  if (
    roleType !== 'admin' &&
    roleType !== 'manager' &&
    roleType !== 'leader' &&
    roleType !== 'colaborator'
  ) {
    return null;
  }

  return {
    id: Number(row.id),
    documentId: readDocumentId(row),
    roleType,
  };
}

async function fetchLeaderTeamDocumentIds(leaderUserId: number): Promise<Set<string>> {
  const teams = await strapi.db.query(TEAM_UID).findMany({
    where: { leader: leaderUserId },
    populate: { colaborators: true },
  });

  const ids = new Set<string>();
  for (const team of teams) {
    const colaborators = team.colaborators as Array<{
      documentId?: string;
      document_id?: string;
    }> | null;
    for (const colaborator of colaborators ?? []) {
      const documentId = readDocumentId(colaborator);
      if (documentId) ids.add(documentId);
    }
  }
  return ids;
}

async function fetchActiveColaborators(): Promise<ScopedColaborator[]> {
  const knex = strapi.db.connection;
  const rows = (await knex(USERS_TABLE)
    .where({ role_type: 'colaborator' })
    .andWhere((builder) => {
      builder.where({ blocked: false }).orWhereNull('blocked');
    })
    .orderBy('name', 'asc')
    .select('document_id', 'name', 'username', 'code')) as Array<{
    document_id?: string;
    name?: string;
    username?: string;
    code?: number;
  }>;

  return rows.map((row) => ({
    documentId: readDocumentId(row),
    name: String(row.name ?? row.username ?? ''),
    code: Number(row.code ?? 0),
  }));
}

async function fetchCurrencies() {
  const currencies = await strapi.documents(CURRENCY_UID).findMany({
    sort: { name: 'asc' },
  });

  return currencies.map((currency) => ({
    id: Number(currency.id),
    documentId: String(currency.documentId),
    name: String(currency.name ?? ''),
    title: String(currency.title ?? currency.name ?? ''),
    pluralTitle: String(currency.pluralTitle ?? currency.title ?? currency.name ?? ''),
    currencyPerSecond: Number(currency.currencyPerSecond ?? 0),
  }));
}

async function resolveColaboratorUserId(documentId: string): Promise<number | null> {
  const user = await strapi.documents(USER_UID).findOne({
    documentId,
    fields: ['id', 'roleType'],
  });
  if (!user || user.roleType !== 'colaborator') return null;
  return Number(user.id);
}

function parseMonthQuery(value: unknown, now: Date): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value)) {
    return now;
  }

  const [year, month] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

export default {
  async monthlyRanking(actorUserId: number, now: Date = new Date()) {
    const actor = await resolveActor(actorUserId);
    if (!actor) throw new Error('forbidden');

    const leaderTeamIds =
      actor.roleType === 'leader'
        ? await fetchLeaderTeamDocumentIds(actor.id)
        : new Set<string>();

    const colaborators = filterRankingColaborators(
      actor.roleType,
      await fetchActiveColaborators(),
      leaderTeamIds,
    );
    const currencies = await fetchCurrencies();
    const monthDate = firstDayOfMonth(now);

    const balances = await strapi.documents(BALANCE_UID).findMany({
      filters: {
        date: monthDate,
        user: {
          documentId: { $in: colaborators.map((colaborator) => colaborator.documentId) },
        },
      },
      populate: {
        user: { fields: ['documentId'] },
        currency: { fields: ['id'] },
      },
    });

    const rankingBalances = balances.map((balance) => ({
      userDocumentId: String(
        (balance.user as { documentId?: string } | null)?.documentId ?? '',
      ),
      currencyId: Number((balance.currency as { id?: number } | null)?.id ?? 0),
      totalIncome: Number(balance.totalIncome ?? 0),
    }));

    return {
      month: monthDate,
      currencies: buildMonthlyRankingRows(
        colaborators.map((colaborator) => ({
          documentId: colaborator.documentId,
          name: colaborator.name,
        })),
        rankingBalances,
        currencies.map((currency) => ({
          id: currency.id,
          name: currency.name,
          title: currency.title,
          pluralTitle: currency.pluralTitle,
        })),
      ),
    };
  },

  async listColaborators(actorUserId: number) {
    const actor = await resolveActor(actorUserId);
    if (!actor) throw new Error('forbidden');

    if (actor.roleType === 'colaborator') {
      throw new Error('forbidden');
    }

    const leaderTeamIds =
      actor.roleType === 'leader'
        ? await fetchLeaderTeamDocumentIds(actor.id)
        : new Set<string>();

    return filterColaboratorsForActor(
      actor.roleType,
      await fetchActiveColaborators(),
      leaderTeamIds,
    );
  },

  async colaboratorInsights(
    actorUserId: number,
    colaboratorDocumentId: string,
    monthQuery: unknown,
    now: Date = new Date(),
  ) {
    const actor = await resolveActor(actorUserId);
    if (!actor) throw new Error('forbidden');

    const leaderTeamIds =
      actor.roleType === 'leader'
        ? await fetchLeaderTeamDocumentIds(actor.id)
        : new Set<string>();

    if (
      !canViewColaboratorInsights(
        actor.roleType,
        actor.documentId,
        colaboratorDocumentId,
        leaderTeamIds,
      )
    ) {
      throw new Error('forbidden');
    }

    const colaboratorUserId = await resolveColaboratorUserId(colaboratorDocumentId);
    if (!colaboratorUserId) throw new Error('not_found');

    const referenceMonth = parseMonthQuery(monthQuery, now);
    const monthStart = firstDayOfMonth(referenceMonth);
    const monthEnd = new Date(
      Date.UTC(referenceMonth.getUTCFullYear(), referenceMonth.getUTCMonth() + 1, 0, 23, 59, 59, 999),
    );

    const currencies = await fetchCurrencies();
    const defaultCurrencyId = currencies[0]?.id ?? 0;

    const activities = await strapi.documents(ACTIVITY_UID).findMany({
      filters: {
        colaborator: { id: colaboratorUserId },
        timestamp: {
          $gte: `${monthStart}T00:00:00.000Z`,
          $lte: monthEnd.toISOString(),
        },
      },
      populate: {
        subTask: { fields: ['expectedTime', 'status'] },
      },
    });

    const activityRows = activities.map((activity) => {
      const subTask = activity.subTask as {
        expectedTime?: number;
        status?: string;
      } | null;

      return {
        timestamp: String(activity.timestamp ?? ''),
        action: activity.action as 'started' | 'stoped',
        subTaskStatus: String(subTask?.status ?? ''),
        expectedTime: Number(subTask?.expectedTime ?? 0),
        starsAwarded: Number(activity.starsAwarded ?? 0),
        currencyId: defaultCurrencyId,
      };
    });

    const previousMonths = buildPreviousMonthsSummary(
      (
        await strapi.documents(BALANCE_UID).findMany({
          filters: {
            user: { id: colaboratorUserId },
          },
          populate: { currency: { fields: ['id'] } },
        })
      ).map((balance) => ({
        month: String(balance.date ?? ''),
        currencyId: Number((balance.currency as { id?: number } | null)?.id ?? 0),
        totalIncome: Number(balance.totalIncome ?? 0),
        totalOutcome: Number(balance.totalOutcome ?? 0),
      })),
      currencies.map((currency) => ({ id: currency.id })),
      referenceMonth,
      3,
    );

    return {
      colaboratorDocumentId,
      month: firstDayOfMonth(referenceMonth),
      dailyIncomeByCurrency: aggregateDailyIncomeFromActivities(
        activityRows,
        currencies.map((currency) => ({
          id: currency.id,
          currencyPerSecond: currency.currencyPerSecond,
        })),
        referenceMonth,
      ),
      previousMonthsByCurrency: previousMonths,
    };
  },
};
