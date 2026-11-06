export type KeyPhase = "down" | "up";

export const activates = (
  key: string,
  phase: KeyPhase,
  held = false,
): boolean => {
  if (held) return false;
  if (key === "Enter") return phase === "down";
  if (key === " ") return phase === "up";
  return false;
};
