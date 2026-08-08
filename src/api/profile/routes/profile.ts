export default {
  routes: [
    {
      method: 'POST',
      path: '/profile/avatar',
      handler: 'profile.updateAvatar',
      config: {
        policies: [],
      },
    },
    {
      method: 'PUT',
      path: '/profile/personal',
      handler: 'profile.updatePersonal',
      config: {
        policies: [],
      },
    },
  ],
};
