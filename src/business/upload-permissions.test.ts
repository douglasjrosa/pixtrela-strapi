import { describe, expect, it } from "vitest";

import { UPLOAD_CONTENT_API_ACTIONS } from "./upload-permissions";

describe("upload permissions bootstrap", () => {
  it("seeds admin upload actions for award images", () => {
    expect(UPLOAD_CONTENT_API_ACTIONS).toContain(
      "plugin::upload.content-api.upload",
    );
    expect(UPLOAD_CONTENT_API_ACTIONS).toContain(
      "plugin::upload.content-api.findOne",
    );
  });
});
