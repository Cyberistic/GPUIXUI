/**
 * The avatar preview's model: initials, a roster and its presence words.
 *
 * The shipped avatar derives its fallback from the name, paints a presence dot
 * from a measured role, and its group keys a member by name. A browser preview
 * cannot mount the native component, so those rules are mirrored here;
 * `avatar-preview.test.ts` executes the component's own `initials` beside this
 * one and reads `avatar.tsx` and the token scale for the geometry, so the
 * drawing cannot drift from the shipped component. The component is the
 * authority: if the two disagree, the preview is the bug.
 */

/** The presence states, in the order the component's union declares them. */
export const presenceStates = ["online", "away", "busy", "offline"] as const;

/** A presence state. */
export type Presence = (typeof presenceStates)[number];

/**
 * The initials' size as a share of the diameter, and the presence dot's size.
 *
 * The component computes `Math.round(diameter * 0.4)` and paints a 10px dot
 * inside a strong edge; the preview draws the same numbers.
 */
export const initialsShare = 0.4;
export const dotSize = 10;

/** One person on the panel. */
export interface RosterMember {
  readonly name: string;
  readonly role: string;
  readonly status?: Presence;
  readonly src?: string;
}

/** The five people the panel opens with: one per state, and one with none. */
export const initialMembers: ReadonlyArray<RosterMember> = [
  { name: "Ada Lovelace", role: "Maintainer", status: "online" },
  { name: "Grace Hopper", role: "Compiler", status: "busy" },
  { name: "Alan Turing", role: "Compiler" },
  { name: "Katherine Johnson", role: "Flight dynamics", status: "away" },
  { name: "Jean Bartik", role: "ENIAC", status: "offline" },
];

/** How many members are in each presence state, and how many in none. */
export interface PresenceCounts {
  readonly online: number;
  readonly away: number;
  readonly busy: number;
  readonly offline: number;
  readonly none: number;
}

/** Count the members by state. */
export const presenceCounts = (
  members: ReadonlyArray<RosterMember>,
): PresenceCounts => ({
  online: members.filter((member) => member.status === "online").length,
  away: members.filter((member) => member.status === "away").length,
  busy: members.filter((member) => member.status === "busy").length,
  offline: members.filter((member) => member.status === "offline").length,
  none: members.filter((member) => member.status === undefined).length,
});

/**
 * The members a filter shows.
 *
 * The online filter is a view over the same list: it never copies a member, and
 * an unfiltered call returns the list it was handed.
 */
export const visibleMembers = (
  members: ReadonlyArray<RosterMember>,
  onlineOnly: boolean,
): ReadonlyArray<RosterMember> =>
  onlineOnly
    ? members.filter((member) => member.status === "online")
    : members;

/** A sentence for the roster: the size, then the states somebody is in. */
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

/** The word for a presence state; a dot is colour-only, so it always has one. */
export const presenceText = (status: Presence | undefined): string => {
  if (status === undefined) return "No presence shown";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

/** What an invite attempt did. */
export type InviteResult =
  | { readonly kind: "refused"; readonly reason: string }
  | { readonly kind: "added"; readonly members: ReadonlyArray<RosterMember> };

/** Trim a name and collapse its internal whitespace. */
const normalName = (name: string): string => name.trim().replace(/\s+/g, " ");

/**
 * Add a member to the panel, or say why not.
 *
 * A face keys on its name — `AvatarGroup` keys a member by name — so a second
 * person with the same name would be one face drawn twice. A blank name would
 * draw an unnamed face with a `?` fallback.
 */
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

/** The initials the component derives from a name. */
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
