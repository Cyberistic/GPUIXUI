/**
 * Every exported pair list, in one place for its two consumers: the uniqueness
 * guard in `contrast.test.ts` (plan 546) and the enforcement guard in
 * `pair-enforcement.test.ts` (plan 754).
 *
 * The record form is the guarantee: its key type derives from the package's
 * exports, so a new `*Pairs` value fails `check-types` until it is listed here,
 * and both guards see it from that one edit.
 */
import * as Tokens from "./index.js";
import type { ContrastPair } from "./index.js";

/** Every `*Pairs` export name, derived from the package's namespace. */
export type PairListName = {
  [Name in keyof typeof Tokens]: Name extends `${string}Pairs` ? Name : never;
}[keyof typeof Tokens];

/**
 * Every exported pair list, keyed by its export name. The key type derives from
 * the package's exports, so a new `*Pairs` value fails `check-types` until it is
 * listed here; the record form, rather than an array literal, is what makes the
 * inventory compile-enforced.
 */
export const publishedPairLists: Readonly<
  Record<PairListName, ReadonlyArray<ContrastPair>>
> = {
  caretPairs: Tokens.caretPairs,
  contrastPairs: Tokens.contrastPairs,
  controlBoundarySoftPairs: Tokens.controlBoundarySoftPairs,
  dialogSurfacePairs: Tokens.dialogSurfacePairs,
  disabledFillPairs: Tokens.disabledFillPairs,
  inactivePairs: Tokens.inactivePairs,
  inactivePanelActionPairs: Tokens.inactivePanelActionPairs,
  inactiveSoftPairs: Tokens.inactiveSoftPairs,
  invalidRingPairs: Tokens.invalidRingPairs,
  markPairs: Tokens.markPairs,
  nativeHighlightPairs: Tokens.nativeHighlightPairs,
  nativeSyntaxPairs: Tokens.nativeSyntaxPairs,
  overlayWashPairs: Tokens.overlayWashPairs,
  ringSoftPairs: Tokens.ringSoftPairs,
  ringTrackPairs: Tokens.ringTrackPairs,
  rowPressStepPairs: Tokens.rowPressStepPairs,
  selectionPressPairs: Tokens.selectionPressPairs,
  selectionPressStepPairs: Tokens.selectionPressStepPairs,
  selectionFillInactivePairs: Tokens.selectionFillInactivePairs,
  selectionFillPairs: Tokens.selectionFillPairs,
  selectionFillWashPairs: Tokens.selectionFillWashPairs,
  selectionInactivePairs: Tokens.selectionInactivePairs,
  selectionInputPairs: Tokens.selectionInputPairs,
  selectionLinkPairs: Tokens.selectionLinkPairs,
  selectionPairs: Tokens.selectionPairs,
  selectionSoftPairs: Tokens.selectionSoftPairs,
  selectionSoftWashPairs: Tokens.selectionSoftWashPairs,
  selectionStatusPairs: Tokens.selectionStatusPairs,
  selectionStepPairs: Tokens.selectionStepPairs,
  selectionWashPairs: Tokens.selectionWashPairs,
  skeletonPulsePairs: Tokens.skeletonPulsePairs,
  softActionLabelPairs: Tokens.softActionLabelPairs,
  softActionPairs: Tokens.softActionPairs,
  softActionStepPairs: Tokens.softActionStepPairs,
  softBorderSurfacePairs: Tokens.softBorderSurfacePairs,
  softFieldPairs: Tokens.softFieldPairs,
  softPanelTextPairs: Tokens.softPanelTextPairs,
  stateFillSurfacePairs: Tokens.stateFillSurfacePairs,
  stateStepPairs: Tokens.stateStepPairs,
  statusFillPairs: Tokens.statusFillPairs,
  toastTonePairs: Tokens.toastTonePairs,
  trackMarkPairs: Tokens.trackMarkPairs,
  trackSurfacePairs: Tokens.trackSurfacePairs,
  washStepPairs: Tokens.washStepPairs,
};
