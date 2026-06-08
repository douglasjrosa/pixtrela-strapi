export default {
  routes: [
    {
      method: 'GET',
      path: '/balances/me/current',
      handler: 'balance.currentForMe',
      config: {
        policies: [],
      },
    },
  ],
};
