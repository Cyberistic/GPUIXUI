/**
 * Browser preview for the Avatar group page.
 *
 * The native facepile overlaps its avatars and caps the overflow behind a chip;
 * the preview draws the same discs, initials, ring and `+N` chip.
 */

const members = [
  "Ada Lovelace",
  "Grace Hopper",
  "Alan Turing",
  "Katherine Johnson",
  "Jean Bartik",
  "Margaret Hamilton",
];

const initials = (name: string): string =>
  name
    .split(" ")
    .filter((word) => word.length > 0)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

const max = 4;

export function AvatarGroupDemo() {
  return (
    <div className="gx-avatargroup" aria-label="Project team" role="group">
      <div className="gx-avatargroup-row">
        {members.slice(0, max).map((name, index) => (
          <span
            aria-label={name}
            className="gx-avatargroup-disc"
            key={name}
            role="img"
            style={{ zIndex: members.length - index }}
          >
            {initials(name)}
          </span>
        ))}
        <span
          aria-label={`${members.length - max} more`}
          className="gx-avatargroup-disc gx-avatargroup-chip"
          role="img"
        >
          +{members.length - max}
        </span>
      </div>
      <p className="gx-avatargroup-readout">{members.length} members</p>
    </div>
  );
}

export const avatarGroupDemoSource = `import { AvatarGroup } from "@gpuixui/components/avatar-group";

<AvatarGroup
  members={[
    { name: "Ada Lovelace", status: "online" },
    { name: "Grace Hopper", status: "busy" },
    { name: "Alan Turing" },
    { name: "Katherine Johnson" },
  ]}
  max={3}
  label="Project team"
/>;`;
