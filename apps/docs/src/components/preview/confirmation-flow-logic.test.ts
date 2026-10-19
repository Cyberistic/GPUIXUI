import { describe, expect, it } from "vitest";
import {
  CONFIRM_WORKSPACE,
  confirmsWorkspace,
} from "../../../preview/patterns/confirmation-flow-logic";

/**
 * The bug this guards: a type-to-confirm check that accepts a near miss turns
 * the confirmation flow into decoration — "atlas-2", a prefix or a different
 * case would delete the workspace without the reader proving they know its
 * name. The rule is exact after trimming; only surrounding space is ignored.
 */
describe("confirmation flow rule", () => {
  it("accepts the workspace name, with surrounding space ignored", () => {
    expect(confirmsWorkspace(CONFIRM_WORKSPACE)).toBe(true);
    expect(confirmsWorkspace(`  ${CONFIRM_WORKSPACE}  `)).toBe(true);
  });

  it("rejects a near miss, a prefix and a different case", () => {
    expect(confirmsWorkspace("")).toBe(false);
    expect(confirmsWorkspace("atlas-2")).toBe(false);
    expect(confirmsWorkspace("atla")).toBe(false);
    expect(confirmsWorkspace("Atlas")).toBe(false);
  });
});
