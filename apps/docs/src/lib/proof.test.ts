/**
 * The landing's numbers (plan 730). Bug guarded: a bench file that lost a field
 * printing `undefined ms` as a measurement, or a hand edit typing a number
 * the bench never wrote.
 */
import { describe, expect, it } from "vitest";
import raw from "./proof.json";
import { decodeProof, proof } from "./proof";

describe("the landing's numbers", () => {
  it("decodes the bench's own file", () => {
    expect(proof.runs).toBeGreaterThanOrEqual(10);
    expect(proof.coldStartMs).toBeGreaterThan(0);
  });

  it("refuses a file that lost a field", () => {
    const { idleRssMb: _dropped, ...partial } = raw;
    expect(() => decodeProof(partial)).toThrow();
  });
});
