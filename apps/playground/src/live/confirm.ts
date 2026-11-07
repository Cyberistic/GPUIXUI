import { Match } from "effect";

export const CONFIRM_OPENER = "confirm-open";

export const CONFIRM_READOUT = "confirm-readout";

export const CONFIRM_CANCEL = "confirm-cancel";

export const CONFIRM_ACCEPT = "confirm-accept";

export interface ConfirmFlow {
  readonly open: boolean;
  readonly opens: number;
  readonly confirms: number;
  readonly closes: number;
}

export type ConfirmEvent = "open" | "cancel" | "confirm";

export const initialConfirmFlow: ConfirmFlow = {
  open: false,
  opens: 0,
  confirms: 0,
  closes: 0,
};

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

export const confirmReadout = (flow: ConfirmFlow): string =>
  `open=${flow.open} opens=${flow.opens} confirms=${flow.confirms} closes=${flow.closes}`;
