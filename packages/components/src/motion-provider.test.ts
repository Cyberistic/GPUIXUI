import { readFileSync } from "node:fs";
import {
  MotionProvider as FullEntryProvider,
  useMotionPreference as fullEntryHook,
} from "@gpuixui/motion/react";
import {
  MotionProvider as PresenceEntryProvider,
  useMotionPreference as presenceEntryHook,
} from "@gpuixui/motion/react/presence";
import { describe, expect, it } from "vitest";
import { MotionProvider, useMotionPreference } from "./motion.js";

const seam = readFileSync(
  new URL("./internal/presence.tsx", import.meta.url),
  "utf8",
);

describe("the motion preference", () => {
  it("is the motion package's provider and hook, not a copy", () => {
    expect(MotionProvider).toBe(PresenceEntryProvider);
    expect(useMotionPreference).toBe(presenceEntryHook);

    expect(FullEntryProvider).toBe(PresenceEntryProvider);
    expect(fullEntryHook).toBe(presenceEntryHook);
  });

  it("declares no context of its own", () => {
    expect(seam).not.toContain("createContext(");

    expect(seam).toContain('from "@gpuixui/motion/react/presence"');
  });

  it("takes the frames and the mounted window from their own subpaths", () => {
    expect(seam).toContain('from "@gpuixui/motion/presence"');
    expect(seam).toContain("useSurfacePresence");
  });
});
