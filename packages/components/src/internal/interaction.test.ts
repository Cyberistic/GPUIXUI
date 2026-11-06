import { describe, expect, it, vi } from "vitest";
import { waitFor } from "./interaction.js";

describe("waitFor", () => {
  it("returns as soon as the check passes", async () => {
    const check = vi.fn();
    await waitFor(check);
    expect(check).toHaveBeenCalledTimes(1);
  });

  it("polls until a later attempt passes", async () => {
    let attempts = 0;
    const check = (): void => {
      attempts += 1;
      expect(attempts).toBeGreaterThan(1);
    };
    await waitFor(check);
    expect(attempts).toBe(2);
  });

  it("rethrows the check's own failure when the state never arrives", async () => {
    await expect(
      waitFor(() => expect("the panel").toBeUndefined(), 30),
    ).rejects.toThrow("expected 'the panel' to be undefined");
  });
});
