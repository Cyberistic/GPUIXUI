import * as Option from "effect/Option";

export interface MarkedElement {
  readonly customProps?: Record<string, unknown>;
  readonly text?: string | null;
  readonly children: ReadonlyArray<number>;
}

const decodeDataUrl = (url: string): Option.Option<string> => {
  if (!url.startsWith("data:")) return Option.none();
  const marker = url.indexOf(",");
  if (marker === -1) return Option.none();
  const metadata = url.slice(0, marker);
  if (!metadata.includes("base64")) return Option.none();
  if (typeof Buffer === "undefined") return Option.none();
  return Option.some(
    Buffer.from(url.slice(marker + 1), "base64").toString("utf8"),
  );
};

export const markupOf = (
  element: MarkedElement | undefined,
): Option.Option<string> => {
  if (element === undefined) return Option.none();
  const source = element.customProps?.source;
  if (typeof source === "string") return Option.some(source);
  const src = element.customProps?.src;
  if (typeof src !== "string") return Option.none();
  return decodeDataUrl(src);
};

export const chartIdOf = (testId: string): string => {
  const marker = testId.lastIndexOf("-layer-");
  return marker === -1 ? testId : testId.slice(0, marker);
};
