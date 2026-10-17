import type { ComponentMetaInput } from "./schema";

type GpuixSupport = ComponentMetaInput["gpuix"];

/**
 * What the inventory's GPUix-support word means to a reader (plan 443). The
 * record mirrors `COMPONENTS.md` verbatim; this is the one map that translates
 * it, shared by the page status block and the component index.
 */
export const supportMeaning: Readonly<Record<GpuixSupport, string>> = {
  yes: "GPUix provides it",
  partial: "GPUix provides part of it",
  reuse: "wraps a GPUix primitive",
  ours: "implemented in this library",
  no: "not provided by GPUix",
  unverified: "not established",
};

/** Legend order. A value missing here fails the index test, not the reader. */
export const supportOrder = [
  "yes",
  "partial",
  "reuse",
  "ours",
  "no",
  "unverified",
] as const satisfies readonly GpuixSupport[];

/** The word and its meaning, in legend order. */
export const supportLegend = supportOrder.map((value) => ({
  value,
  meaning: supportMeaning[value],
}));
