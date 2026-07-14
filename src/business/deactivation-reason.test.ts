import { describe, expect, it } from "vitest";

import {
  assertReasonWhenDeactivating,
  DEACTIVATION_REASON_MIN_LENGTH,
  isDeactivationReasonValid,
} from "./deactivation-reason";

describe("isDeactivationReasonValid", () => {
  it("rejects short or empty reasons", () => {
    expect(isDeactivationReasonValid(undefined)).toBe(false);
    expect(isDeactivationReasonValid("")).toBe(false);
    expect(isDeactivationReasonValid("a".repeat(99))).toBe(false);
  });

  it("accepts trimmed reasons with minimum length", () => {
    const reason = "a".repeat(DEACTIVATION_REASON_MIN_LENGTH);
    expect(isDeactivationReasonValid(reason)).toBe(true);
    expect(isDeactivationReasonValid(`  ${reason}  `)).toBe(true);
  });
});

describe("assertReasonWhenDeactivating", () => {
  it("does nothing when not deactivating", () => {
    expect(() => assertReasonWhenDeactivating(false, "")).not.toThrow();
  });

  it("throws when deactivating without a valid reason", () => {
    expect(() => assertReasonWhenDeactivating(true, "short")).toThrow(
      "invalidDeactivationReason",
    );
  });

  it("accepts a valid reason when deactivating", () => {
    expect(() =>
      assertReasonWhenDeactivating(
        true,
        "a".repeat(DEACTIVATION_REASON_MIN_LENGTH),
      ),
    ).not.toThrow();
  });
});
