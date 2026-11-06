import { accessibleName } from "@gpuixui/primitives/core";

export const draftOf = (value: unknown): string =>
  typeof value === "string" ? value : "";

export const labelOf = (label: unknown, fallback: string): string =>
  accessibleName(draftOf(label)) ?? fallback;
