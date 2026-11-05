import type { PlatformName, ThemeMode } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";

export { nativeCaptureFrame } from "./native-captures.generated";

/**
 * The native frames rendered at build time, and how to show one live.
 *
 * `scripts/native-previews.ts` boots the wasm renderer in headless Chrome once
 * per registered example and writes the frame here. The glob is eager, so the
 * docs build knows every capture at render time and a server-rendered page can
 * carry the real frame before any client JavaScript runs.
 */
const assets = import.meta.glob<string>("../assets/native/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

/** `…/accordion.webp` → `accordion`; a path without a file name is dropped. */
const idOf = (path: string): string | undefined =>
  path
    .split("/")
    .at(-1)
    ?.replace(/\.webp$/, "");

const captures: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(assets).flatMap(([path, url]) => {
    const id = idOf(path);
    return id === undefined ? [] : [[id, url] as const];
  }),
);

/** The ids with a checked-in frame, in a stable order. */
export const nativeCaptureIds: ReadonlyArray<string> = Arr.sort(
  Object.keys(captures),
  Order.String,
);

/** The frame's URL, or `undefined` when the example has not been captured. */
export const nativeCaptureOf = (id: string): string | undefined =>
  Object.hasOwn(captures, id) ? captures[id] : undefined;

/** The component a docs path names: `/components/accordion` → `accordion`. */
export const componentIdFromPath = (pathname: string): string | undefined =>
  pathname.split("/").filter(Boolean).at(-1);

/**
 * The live scene for one captured example, on the reader's platform and mode.
 *
 * The capture is a still of one platform and palette; this link is how a
 * reader opens the same tree, interactive, in the wasm renderer.
 */
export const nativeExampleHref = (
  id: string,
  platform: PlatformName,
  mode: ThemeMode,
): string =>
  `/live?scene=example&id=${encodeURIComponent(id)}&platform=${platform}&mode=${mode}`;
