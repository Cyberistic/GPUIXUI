/**
 * Shared checks for the JSX runtimes: only a GPUix host element with a
 * `className` is wrapped; everything else goes straight to React.
 */

import * as HashSet from "effect/HashSet";

const HOSTS = HashSet.fromIterable<string>([
  "div",
  "text",
  "img",
  "svg",
  "canvas",
  "input",
  "textarea",
  "anchored",
  "code",
  "diff",
  "markdown",
  "virtual-list",
]);

/** Whether a JSX type is a GPUix host element. */
export const isHost = (type: unknown): type is string =>
  typeof type === "string" && HashSet.has(HOSTS, type);

/** Whether the props carry a class string. */
export const isClassed = (
  props: Record<string, unknown> | null,
): props is Record<string, unknown> & { className: string } =>
  props !== null && typeof props.className === "string";

/** Adds the host name the wrapper needs. */
export const withHost = (
  type: string,
  props: Record<string, unknown>,
): Record<string, unknown> => ({ ...props, as: type });
