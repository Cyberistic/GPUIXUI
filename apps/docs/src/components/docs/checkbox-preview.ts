export { activates, type KeyPhase } from "./selection-preview";

export interface Channel {
  readonly value: string;
  readonly label: string;
  readonly description: string;

  readonly managed?: boolean;
}

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

export type GroupState = "all" | "some" | "none";

export const editableChannels = (
  list: ReadonlyArray<Channel> = channels,
): ReadonlyArray<Channel> => list.filter((channel) => channel.managed !== true);

export const groupState = (
  chosen: ReadonlyArray<string>,
  list: ReadonlyArray<Channel> = channels,
): GroupState => {
  const editable = editableChannels(list);
  const on = editable.filter((channel) => chosen.includes(channel.value));
  if (on.length === editable.length) return "all";
  return on.length === 0 ? "none" : "some";
};

export const parentPaint = (
  state: GroupState,
): { readonly checked: boolean; readonly indeterminate: boolean } => ({
  checked: state === "all",
  indeterminate: state === "some",
});

const ordered = (
  chosen: ReadonlyArray<string>,
  list: ReadonlyArray<Channel>,
): ReadonlyArray<string> =>
  list.filter((channel) => chosen.includes(channel.value)).map((c) => c.value);

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
