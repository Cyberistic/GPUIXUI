/**
 * The component pages with neither a live GPUix scene nor a tier-A
 * illustration, and the measured reason each one has none (plans 457, 458, 461,
 * 484, 486).
 *
 * **The set is empty since plan 486.** The five pages that used to be here —
 * tooltip, context menu, date picker, combobox and hotkey input — are live
 * scenes opened by a real GPUI gesture through the renderer's own automation
 * API, and `smoke:preview` proves each surface paints only after that gesture.
 * `scene-contract.test.ts` proves this set equals the real gaps on delivered
 * pages; `preview-gaps.test.ts` proves `docs/preview-strategy.md` names the same
 * set, so the document cannot drift from the code.
 *
 * A page that gains a gap again must be added here with its measured reason — a
 * reason that stops being true (a gesture now opens the surface) is a failure,
 * not a reword: the page then moves to a live scene.
 */
export const NO_LIVE_SCENE: ReadonlyMap<string, string> = new Map();

/**
 * Stateful pages whose documented state no gesture step can reach yet (plan
 * 508). This is the second measured set, not a parking space: a scene that
 * becomes possible must move out of it, and `scene-contract.test.ts` compares
 * both directions with the real registry. **Empty since plan 513**, which gave
 * `SceneStep` a wheel and moved Message scroller's unpinned affordance onto the
 * live surface; the set stays so the next stateful record cannot ship silently.
 */
export const STATEFUL_NO_LIVE_SCENE: ReadonlyMap<string, string> = new Map();
