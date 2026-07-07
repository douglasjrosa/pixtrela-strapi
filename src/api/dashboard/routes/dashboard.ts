export default {
  routes: [
    {
      method: 'GET',
      path: '/dashboard/monthly-ranking',
      handler: 'dashboard.monthlyRanking',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/dashboard/colaborators',
      handler: 'dashboard.listColaborators',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/dashboard/colaborator/:documentId/insights',
      handler: 'dashboard.colaboratorInsights',
      config: {
        policies: [],
      },
    },
  ],
};
