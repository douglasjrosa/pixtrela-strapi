/** Roles that may upload media via POST /api/upload (awards, avatars, face). */
export const UPLOAD_CONTENT_API_ACTIONS = [
  "plugin::upload.content-api.upload",
  "plugin::upload.content-api.find",
  "plugin::upload.content-api.findOne",
] as const;
