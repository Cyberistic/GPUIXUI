/**
 * The checkbox preview's two models.
 *
 * The box itself is small: three states over one paint, a 24px press target
 * around an icon-sized drawing, and two keyboard edges. What a drawing cannot
 * show is the **group arithmetic** a "select all" parent uses — and the two
 * rules that surprised the primitive's own page: an indeterminate parent
 * **selects** the next time it is pressed (activation toggles the underlying
 * boolean, so `checked` goes false → true), and a managed row is not the
 * reader's to change.
 *
 * The keyboard edge is read from `core/keyboard.ts` by the test rather than
 * trusted, because Space on the wrong edge is a double toggle.
 */

export { activates, type KeyPhase } from "./selection-preview";

/** One notification channel a reader can switch on. */
export interface Channel {
  readonly value: string;
  readonly label: string;
  readonly description: string;
  /** Set by an administrator: shown, never toggled. */
  readonly managed?: boolean;
}

/** The four channels of the preview's workflow. */
export const channels: ReadonlyArray<Channel> = [
  {
    value: "email",
    label: "Email",
    description: "A digest to your account address.",
  },
  {
    value: "desktop",
    label: "Desktop",
    description: "A banner while the app is open.",
  },
  {
    value: "mobile",
    label: "Mobile",
    description: "A push when the device is away from the desk.",
  },
  {
    value: "push",
    label: "Push (managed)",
    description: "Your organisation sets this one.",
    managed: true,
  },
];

/** What a group of boxes currently reads as. */
export type GroupState = "all" | "some" | "none";

/** The channels the reader may change; a managed row is not one of them. */
export const editableChannels = (
  list: ReadonlyArray<Channel> = channels,
): ReadonlyArray<Channel> => list.filter((channel) => channel.managed !== true);

/**
 * The parent's tri-state, counted over the channels a reader can change.
 *
 * A managed row is excluded rather than counted as off: "All channels" is a
 * promise about the switches the reader owns, and a managed row the reader
 * cannot turn on must not leave the parent permanently half-checked.
 */
export const groupState = (
  chosen: ReadonlyArray<string>,
  list: ReadonlyArray<Channel> = channels,
): GroupState => {
  const editable = editableChannels(list);
  const on = editable.filter((channel) => chosen.includes(channel.value));
  if (on.length === editable.length) return "all";
  return on.length === 0 ? "none" : "some";
};

/**
 * The parent box's paint: checked only when every editable channel is on,
 * indeterminate while some are.
 *
 * `some` is a **paint** state, not a third value — the box's own `checked`
 * boolean is false, so the next press reports `true` and selects everything.
 */
export const parentPaint = (
  state: GroupState,
): { readonly checked: boolean; readonly indeterminate: boolean } => ({
  checked: state === "all",
  indeterminate: state === "some",
});

/** `chosen` in the list's declaration order, so a readout cannot reshuffle. */
const ordered = (
  chosen: ReadonlyArray<string>,
  list: ReadonlyArray<Channel>,
): ReadonlyArray<string> =>
  list.filter((channel) => chosen.includes(channel.value)).map((c) => c.value);

/**
 * The parent's next selection, from the state it is in.
 *
 * An indeterminate parent becomes **checked** (the box's underlying boolean was
 * false), and one already checked clears every editable channel. A managed
 * selection survives both directions, because the reader never set it.
 */
export const toggleAll = (
  chosen: ReadonlyArray<string>,
  list: ReadonlyArray<Channel> = channels,
): ReadonlyArray<string> => {
  const editable = editableChannels(list).map((channel) => channel.value);
  const keep = chosen.filter((value) => !editable.includes(value));
  return groupState(chosen, list) === "all"
    ? ordered(keep, list)
    : ordered([...keep, ...editable], list);
};

/**
 * One row's next selection: the value is appended in the order chosen, and a
 * managed row returns the selection unchanged.
 */
export const toggleChannel = (
  chosen: ReadonlyArray<string>,
  value: string,
  list: ReadonlyArray<Channel> = channels,
): ReadonlyArray<string> => {
  const channel = list.find((candidate) => candidate.value === value);
  if (channel === undefined || channel.managed === true) return chosen;
  return chosen.includes(value)
    ? chosen.filter((current) => current !== value)
    : [...chosen, value];
};

/** The words the preview's readout prints for a state. */
export const describeGroup = (
  state: GroupState,
  chosen: ReadonlyArray<string>,
  list: ReadonlyArray<Channel> = channels,
): string => {
  const editable = editableChannels(list);
  const on = editable.filter((channel) =>
    chosen.includes(channel.value),
  ).length;
  const managed = list.length - editable.length;
  const managedNote =
    managed === 0
      ? ""
      : ` ${managed === 1 ? "One channel is" : `${managed} channels are`} managed.`;
  return state === "all"
    ? `All ${editable.length} editable channels are on.${managedNote}`
    : state === "none"
      ? `No editable channel is on.${managedNote}`
      : `${on} of ${editable.length} editable channels are on.${managedNote}`;
};
