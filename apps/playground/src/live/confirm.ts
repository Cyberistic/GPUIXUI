/**
 * The caller's half of the `ConfirmDialog` contract, as the probe drives it.
 *
 * The shipped confirmation *reports* and does not close: the app owns the close,
 * because a failed save has to stay visible instead of vanishing mid-flight. So
 * the probe's fixture plays the caller, and the readout it paints is the
 * evidence — a confirm increments its own count **and** closes the surface, a
 * cancel (or Escape) closes without reporting, and every open counts. The
 * arithmetic lives here so `confirm.test.ts` can hold the numbers the window's
 * checks are read against.
 */
import { Match } from "effect";

/** The app control that opens the confirmation. */
export const CONFIRM_OPENER = "confirm-open";

/** The readout the checks assert against. */
export const CONFIRM_READOUT = "confirm-readout";

/** The shipped dialog's cancel action (`testId` in the component). */
export const CONFIRM_CANCEL = "confirm-cancel";

/** The shipped dialog's confirm action. */
export const CONFIRM_ACCEPT = "confirm-accept";

/** What the caller has recorded: the open state and each path's count. */
export interface ConfirmFlow {
  readonly open: boolean;
  readonly opens: number;
  readonly confirms: number;
  readonly closes: number;
}

/**
 * An open, a reported confirm, or a close that reports nothing.
 *
 * A dismissal (`Escape`, an outside press) arrives as `onOpenChange(false)`,
 * the same event Cancel sends, so the two share one case: neither may report a
 * confirm.
 */
export type ConfirmEvent = "open" | "cancel" | "confirm";

/** The flow before the reader has pressed anything. */
export const initialConfirmFlow: ConfirmFlow = {
  open: false,
  opens: 0,
  confirms: 0,
  closes: 0,
};

/** A confirm closes because the caller closes it — the component never does. */
export const confirmFlow = (
  flow: ConfirmFlow,
  event: ConfirmEvent,
): ConfirmFlow =>
  Match.value(event).pipe(
    Match.when("open", () => ({ ...flow, open: true, opens: flow.opens + 1 })),
    Match.when("cancel", () => ({
      ...flow,
      open: false,
      closes: flow.closes + 1,
    })),
    Match.when("confirm", () => ({
      ...flow,
      open: false,
      confirms: flow.confirms + 1,
      closes: flow.closes + 1,
    })),
    Match.exhaustive,
  );

/** The `key=value` line the probe's assertions read. */
export const confirmReadout = (flow: ConfirmFlow): string =>
  `open=${flow.open} opens=${flow.opens} confirms=${flow.confirms} closes=${flow.closes}`;
