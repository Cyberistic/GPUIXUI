/**
 * The component pages with neither a live GPUix scene nor a tier-A
 * illustration, and the measured reason each one has none (plans 457, 458,
 * 461). `scene-contract.test.ts` proves this set equals the real gaps on
 * delivered pages; `preview-gaps.test.ts` proves `docs/preview-strategy.md`
 * names the same set, so the document cannot drift from the code.
 *
 * A reason that stops being true (a prop opens the surface) is a failure, not
 * a reword: the page then moves to a live scene.
 */
export const NO_LIVE_SCENE: ReadonlyMap<string, string> = new Map([
  [
    "combobox",
    "the wrapper owns the popup's open state and exposes no defaultOpen",
  ],
  [
    "context-menu",
    "the surface paints at an internal point no prop can set (plan 457)",
  ],
  ["date-picker", "the picker owns its open state and exposes no defaultOpen"],
  [
    "drawer",
    "the panel exists only while open and is anchored by its trigger; an approximation would show a button, not the drawer",
  ],
  [
    "hotkey-input",
    "the field's content is a captured chord, which needs a real key event rather than a static layout",
  ],
  [
    "mention-input",
    "the suggestion list exists only while a query is open and no prop opens it",
  ],
  [
    "navigation-menu",
    "the panel exists only while open; the rest state is a trigger row that proves nothing about the menu",
  ],
  [
    "toast",
    "a scene must race the toast's own dismissal, and its provider pulls the Effect runtime into every scene",
  ],
  [
    "tooltip",
    "the wrapper exposes no open state, and a headless check cannot prove a hover-opened tip",
  ],
]);
