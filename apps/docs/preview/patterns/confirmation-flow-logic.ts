/**
 * The one decision the confirmation-flow pattern makes, kept pure so a test can
 * fail without a GPUix window.
 *
 * The workspace name is lower-case because the live scene is driven through
 * `Locator.fill`, whose typed characters arrive without a shift modifier; an
 * upper-case label would make the documented gesture type the wrong text.
 */
export const CONFIRM_WORKSPACE = "atlas";

/**
 * The typed name matches the workspace once surrounding space is ignored. The
 * check is exact otherwise: a near-miss must not unlock a destructive action.
 */
export const confirmsWorkspace = (typed: string): boolean =>
  typed.trim() === CONFIRM_WORKSPACE;
