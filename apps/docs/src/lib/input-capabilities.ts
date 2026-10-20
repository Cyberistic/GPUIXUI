import { hostPropNames } from "./host-props";

/**
 * The input surface `/docs/accessibility` documents (plan 621).
 *
 * `HostProps` is the runtime's whole event surface, so the page can state what
 * a part receives and — the part a reader asks about — which event families do
 * not exist. The grouping lives here rather than in the page so a dependency
 * upgrade that adds `onTouchStart`, renames a mouse handler or drops `onScroll`
 * fails by name instead of leaving the prose behind.
 *
 * Pure on purpose: the page test feeds the installed declarations, and the
 * fixture test feeds a package that declares touch, so the rule is proved in
 * both directions without editing `node_modules`.
 */

/** The handler groups a page must describe. */
export interface InputHandlers {
  readonly mouse: ReadonlyArray<string>;
  readonly keyboard: ReadonlyArray<string>;
  readonly touch: ReadonlyArray<string>;
  readonly scroll: ReadonlyArray<string>;
}

/** The sentence the page must carry while the runtime declares no touch input. */
export const ABSENT_INPUT_CLAIM = "no touch, pointer or stylus events";

const isMouse = (name: string): boolean =>
  name === "onClick" || name === "onAuxClick" || name.startsWith("onMouse");

const isKeyboard = (name: string): boolean => name.startsWith("onKey");

const isTouch = (name: string): boolean =>
  name.startsWith("onTouch") ||
  name.startsWith("onPointer") ||
  name.toLowerCase().includes("stylus");

/** The four groups, in `HostProps` declaration order. */
export const inputHandlers = (declarations: string): InputHandlers => {
  const names = hostPropNames(declarations);
  return {
    mouse: names.filter(isMouse),
    keyboard: names.filter(isKeyboard),
    touch: names.filter(isTouch),
    scroll: names.filter((name) => name === "onScroll"),
  };
};

/** Named failures, empty when the page matches the installed declarations. */
export const inputCapabilityViolations = (input: {
  readonly declarations: string;
  readonly page: string;
}): ReadonlyArray<string> => {
  const handlers = inputHandlers(input.declarations);
  const missing = [
    ...handlers.mouse,
    ...handlers.keyboard,
    ...handlers.scroll,
  ].filter((name) => !input.page.includes(name));

  const claimsAbsence = input.page.includes(ABSENT_INPUT_CLAIM);
  const declaresNone = handlers.touch.length === 0;

  return [
    ...missing.map((name) => `${name} is declared but not named on the page`),
    ...(declaresNone && !claimsAbsence
      ? [
          "the page does not state that touch, pointer and stylus events are absent",
        ]
      : []),
    ...(!declaresNone && claimsAbsence
      ? [
          `the page claims no touch input while the package declares ${handlers.touch.join(", ")}`,
        ]
      : []),
  ];
};
