export default {
  routes: [
    {
      method: 'POST',
      path: '/kiosk/identify',
      handler: 'kiosk.identify',
      config: {
        auth: false,
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/kiosk/staff/users/:documentId',
      handler: 'kiosk.getStaffUser',
      config: {
        auth: false,
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/kiosk/staff/users/:documentId/colaborators',
      handler: 'kiosk.listStaffColaborators',
      config: {
        auth: false,
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/kiosk/staff/users/:documentId/colaborators/:colaboratorDocumentId/password',
      handler: 'kiosk.setColaboratorPassword',
      config: {
        auth: false,
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/kiosk/staff/users/:documentId/colaborators/:colaboratorDocumentId/avatar',
      handler: 'kiosk.setColaboratorAvatar',
      config: {
        auth: false,
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/kiosk/staff/users/:documentId/colaborators/:colaboratorDocumentId/face-photo',
      handler: 'kiosk.setColaboratorFacePhoto',
      config: {
        auth: false,
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/kiosk/directory/teams',
      handler: 'kiosk.listDirectoryTeams',
      config: {
        auth: false,
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/kiosk/directory/teams/:teamDocumentId/colaborators',
      handler: 'kiosk.listDirectoryTeamColaborators',
      config: {
        auth: false,
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/kiosk/colaborators/:documentId/sub-tasks',
      handler: 'kiosk.listSubTasks',
      config: {
        auth: false,
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/kiosk/colaborators/:documentId/sub-tasks/:subTaskDocumentId/start',
      handler: 'kiosk.startSubTask',
      config: {
        auth: false,
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/kiosk/colaborators/:documentId/sub-tasks/:subTaskDocumentId/stop',
      handler: 'kiosk.stopSubTask',
      config: {
        auth: false,
        policies: [],
      },
    },
  ],
};
