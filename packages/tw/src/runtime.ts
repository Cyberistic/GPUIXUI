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

export const isHost = (type: unknown): type is string =>
  typeof type === "string" && HashSet.has(HOSTS, type);

export const isClassed = (
  props: Record<string, unknown> | null,
): props is Record<string, unknown> & { className: string } =>
  props !== null && typeof props.className === "string";

export const withHost = (
  type: string,
  props: Record<string, unknown>,
): Record<string, unknown> => ({ ...props, as: type });
