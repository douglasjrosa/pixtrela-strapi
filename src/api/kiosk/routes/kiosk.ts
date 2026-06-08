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
