export default {
  routes: [
    {
      method: 'POST',
      path: '/auth/login-by-code',
      handler: 'auth-identify.loginByCode',
      config: {
        auth: false,
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/auth/login-by-tag',
      handler: 'auth-identify.loginByTag',
      config: {
        auth: false,
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/auth/login-by-face',
      handler: 'auth-identify.loginByFace',
      config: {
        auth: false,
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/auth/login-by-face-confirm',
      handler: 'auth-identify.loginByFaceConfirm',
      config: {
        auth: false,
        policies: [],
      },
    },
  ],
};
