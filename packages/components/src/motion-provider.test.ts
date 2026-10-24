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

/** The package's own motion entry, which re-publishes the provider. */
const entry = readFileSync(new URL("./motion.tsx", import.meta.url), "utf8");

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

  it("names the subpaths the frames and the mounted window live on", () => {
    // The bug this guards: the entry said the frames and the mount window live
    // in `internal/presence.tsx`, but both moved to the motion package when the
    // presence table was shared — the frames to `@gpuixui/motion/presence`, the
    // mounted window to `@gpuixui/motion/react` — and this package's seam only
    // re-publishes them. A reader told the seam owns the rule would look for
    // it here and find a re-export.
    expect(entry).toContain("@gpuixui/motion/presence");
    expect(entry).toContain("@gpuixui/motion/react");
    expect(entry).not.toContain("the frames and the mount window live in");
    // The seam really does re-publish both halves, so the entry's claim and the
    // code agree.
    expect(seam).toContain('from "@gpuixui/motion/presence"');
    expect(seam).toContain("useSurfacePresence");
  });
});
