export const presenceStates = ["online", "away", "busy", "offline"] as const;

export type Presence = (typeof presenceStates)[number];

export const initialsShare = 0.44;
export const dotSize = 10;

export interface RosterMember {
  readonly name: string;
  readonly role: string;
  readonly status?: Presence;
  readonly src?: string;
}

export const initialMembers: ReadonlyArray<RosterMember> = [
  { name: "Ada Lovelace", role: "Maintainer", status: "online" },
  { name: "Grace Hopper", role: "Compiler", status: "busy" },
  { name: "Alan Turing", role: "Compiler" },
  { name: "Katherine Johnson", role: "Flight dynamics", status: "away" },
  { name: "Jean Bartik", role: "ENIAC", status: "offline" },
];

export interface PresenceCounts {
  readonly online: number;
  readonly away: number;
  readonly busy: number;
  readonly offline: number;
  readonly none: number;
}

export const presenceCounts = (
  members: ReadonlyArray<RosterMember>,
): PresenceCounts => ({
  online: members.filter((member) => member.status === "online").length,
  away: members.filter((member) => member.status === "away").length,
  busy: members.filter((member) => member.status === "busy").length,
  offline: members.filter((member) => member.status === "offline").length,
  none: members.filter((member) => member.status === undefined).length,
});

export const visibleMembers = (
  members: ReadonlyArray<RosterMember>,
  onlineOnly: boolean,
): ReadonlyArray<RosterMember> =>
  onlineOnly ? members.filter((member) => member.status === "online") : members;

export const describeRoster = (
  members: ReadonlyArray<RosterMember>,
): string => {
  const counts = presenceCounts(members);
  const shown = presenceStates
    .filter((state) => counts[state] > 0)
    .map((state) => `${counts[state]} ${state}`);
  return `${members.length} members · ${
    shown.length === 0 ? "no presence shown" : shown.join(", ")
  }`;
};

export const presenceText = (status: Presence | undefined): string => {
  if (status === undefined) return "No presence shown";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export type InviteResult =
  | { readonly kind: "refused"; readonly reason: string }
  | { readonly kind: "added"; readonly members: ReadonlyArray<RosterMember> };

const normalName = (name: string): string => name.trim().replace(/\s+/g, " ");

export const invite = (
  members: ReadonlyArray<RosterMember>,
  name: string,
): InviteResult => {
  const wanted = normalName(name);
  if (wanted === "") return { kind: "refused", reason: "A name is required." };
  const existing = members.find(
    (member) => normalName(member.name).toLowerCase() === wanted.toLowerCase(),
  );
  if (existing !== undefined) {
    return {
      kind: "refused",
      reason: `${existing.name} is already on the panel.`,
    };
  }
  return {
    kind: "added",
    members: [...members, { name: wanted, role: "Invited" }],
  };
};

export const initialsFor = (name: string): string => {
  const parts = normalName(name)
    .split(/[\s-]+/)
    .filter((part) => part.length > 0);
  const letters = parts.flatMap((part) => {
    const first = [...part][0];
    return first === undefined ? [] : [first.toUpperCase()];
  });
  const first = letters[0];
  const last = letters[letters.length - 1];
  if (first === undefined) return "?";
  return first === last ? first : `${first}${last}`;
};
