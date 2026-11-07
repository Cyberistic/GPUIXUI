import * as Str from "effect/String";

export const accessibleName = (label: unknown, fallback: string): string => {
  const text = typeof label === "string" ? Str.trim(label) : "";
  return Str.isEmpty(text) ? fallback : text;
};

export const PICTURE_NAME = "Picture";
