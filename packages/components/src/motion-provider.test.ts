/**
 * The preference is one context, and it belongs to `@gpuixui/motion`.
 *
 * The bug this guards: the reduced-motion preference was declared inside this
 * package, so a package that moves but does not depend on the components —
 * `@gpuixui/primitives` animates its Tooltip, Switch and Progress — could not
 * read it and took a `reducedMotion` prop per control instead. A tree wrapped in
 * one `MotionProvider` therefore still animated the primitives, and every
 * consumer had to state the preference twice. The context lives in the package
 * that owns the timing and the policy; this package re-publishes it, so the two
 * entries must be the same functions and no second context may be declared here.
 *
 * Sync `node:fs` is deliberate and test-time only: this is the same repository
 * walk `presence-contract.test.ts` and `inventory.test.ts` perform, and a plain
 * `it` has no Effect runtime to provide `FileSystem` to. The package's runtime
 * source imports neither.
 */

import { readFileSync } from "node:fs";
import {
  MotionProvider as PackageProvider,
  useMotionPreference as packageHook,
} from "@gpuixui/motion/react";
import { describe, expect, it } from "vitest";
import { MotionProvider, useMotionPreference } from "./motion.js";

/** The seam that re-publishes the provider for this package's surfaces. */
const seam = readFileSync(
  new URL("./internal/presence.tsx", import.meta.url),
  "utf8",
);

describe("the motion preference", () => {
  it("is the motion package's provider and hook, not a copy", () => {
    expect(MotionProvider).toBe(PackageProvider);
    expect(useMotionPreference).toBe(packageHook);
  });

  it("declares no context of its own", () => {
    // A local `createContext` is the failure: it type-checks, it provides a
    // preference, and every surface below one provider silently animates.
    expect(seam).not.toContain("createContext(");
    expect(seam).toContain('from "@gpuixui/motion/react"');
  });
});
