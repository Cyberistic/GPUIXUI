/**
 * Browser previews for the Avatar page.
 *
 * The shipped avatar is a GPUix host tree: a disc that clips a picture (or the
 * initials derived from the name) and a presence dot on the rim. The preview
 * cannot mount it, so it draws the same shapes from the theme bridge and says
 * so. The rules that can be wrong — the initials, the roster's words and the
 * invite gate — live in `avatar-preview.ts` so a test can fail on them; this
 * file only renders them. The Code tab always shows the native usage, and the
 * team panel around the avatars is app composition, not a component.
 */

import { avatarSize } from "@gpuixui/tokens";
import { useState, type ReactNode } from "react";
import {
  describeRoster,
  initialMembers,
  initialsFor,
  initialsShare,
  invite,
  presenceStates,
  presenceText,
  visibleMembers,
  type Presence,
  type RosterMember,
} from "./avatar-preview";
import { usePlatform } from "./platform-toggle";

const sizes = ["xs", "sm", "md", "lg"] as const;
type Size = (typeof sizes)[number];

/** A drawn portrait for the preview's picture path: a drawing, not a photo. */
const portraitSrc = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#4F46E5"/><circle cx="16" cy="12" r="6" fill="#E0E7FF"/><path d="M4 32c0-7 5.4-12 12-12s12 5 12 12z" fill="#E0E7FF"/></svg>`,
)}`;

interface DiscProps {
  readonly name: string;
  readonly src?: string;
  readonly size?: Size;
  readonly status?: Presence;
}

/**
 * One avatar: the disc, the fallback or the picture, and the dot.
 *
 * The root is `role="img"` named after the person and described by its
 * presence, and the disc's contents are presentational — the same one-node
 * contract the component documents.
 */
const Disc = ({ name, src, size = "md", status }: DiscProps) => {
  const diameter = avatarSize[size];
  return (
    <div
      aria-description={status}
      aria-label={name}
      className="gx-avatar"
      data-size={size}
      role="img"
      style={{ width: diameter, height: diameter }}
    >
      <span className="gx-avatar-disc">
        {src === undefined ? (
          <span
            aria-hidden="true"
            className="gx-avatar-initials"
            style={{ fontSize: Math.round(diameter * initialsShare) }}
          >
            {initialsFor(name)}
          </span>
        ) : (
          <img alt="" className="gx-avatar-photo" src={src} />
        )}
      </span>
      {status === undefined ? null : (
        <span
          aria-hidden="true"
          className="gx-avatar-dot"
          data-status={status}
        />
      )}
    </div>
  );
};

/** A labelled run of discs, as the states preview prints them. */
const Run = ({
  children,
  label,
}: {
  readonly children: ReactNode;
  readonly label: string;
}) => (
  <div aria-label={label} className="gx-avatar-run" role="group">
    <p className="gx-avatar-run-label">{label}</p>
    <div className="gx-avatar-row">{children}</div>
  </div>
);

/** The roster row: the avatar, the name, the role and the presence word. */
const Row = ({ member }: { readonly member: RosterMember }) => (
  <li className="gx-avatar-roster-row">
    <Disc name={member.name} src={member.src} status={member.status} />
    <span className="gx-avatar-copy">
      <span className="gx-avatar-name">{member.name}</span>
      <span className="gx-avatar-role">{member.role}</span>
    </span>
    <span className="gx-avatar-presence">{presenceText(member.status)}</span>
  </li>
);

/**
 * The interactive preview: a team panel with an online filter and an invite.
 *
 * The panel is app composition — the shipped `Avatar` draws the faces and
 * nothing else. The invite is refused for a blank or duplicate name because a
 * face keys on its name, and the sentence the panel prints for each refusal is
 * the model's.
 */
export function AvatarWorkflowBody() {
  const [members, setMembers] = useState(initialMembers);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");

  const shown = visibleMembers(members, onlineOnly);

  const submit = (): void => {
    const result = invite(members, draft);
    if (result.kind === "refused") {
      setNotice(result.reason);
      return;
    }
    setMembers(result.members);
    setNotice(`Added ${draft.trim()}.`);
    setDraft("");
  };

  return (
    <div className="gx-avatar-demo">
      <div className="gx-avatar-head">
        <div>
          <p className="gx-avatar-title">Team</p>
          <p className="gx-avatar-readout">{describeRoster(members)}</p>
        </div>
        <button
          aria-pressed={onlineOnly}
          className="gx-avatar-choice-button"
          data-chosen={onlineOnly ? "" : undefined}
          onClick={() => setOnlineOnly((value) => !value)}
          type="button"
        >
          Online only
        </button>
      </div>

      <ul className="gx-avatar-roster">
        {shown.map((member) => (
          <Row key={member.name} member={member} />
        ))}
      </ul>

      <div className="gx-avatar-invite">
        <input
          aria-label="Invite a teammate"
          className="gx-avatar-input"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
          placeholder="Name"
          value={draft}
        />
        <button
          className="gx-avatar-choice-button"
          onClick={submit}
          type="button"
        >
          Invite
        </button>
      </div>
      {notice === "" ? null : (
        <p className="gx-avatar-notice" role="status">
          {notice}
        </p>
      )}
      <p className="gx-avatar-foot">
        The panel, the filter and the invite are the preview&apos;s composition;
        the shipped <code>Avatar</code> draws one face. A face keys on its name,
        so a second Ada would be one face drawn twice.
      </p>
    </div>
  );
}

/** The still preview: presence words, the four sizes and the fallback edges. */
export function AvatarStatesBody() {
  const edgeNames = [
    "Grace Brewster Murray Hopper",
    "  Ada   Lovelace  ",
    "-",
    "🎨🎨 Ada",
  ] as const;

  return (
    <div className="gx-avatar-demo">
      <Run label="Presence">
        {presenceStates.map((status) => (
          <span className="gx-avatar-state" key={status}>
            <Disc name="Ada Lovelace" status={status} />
            <span className="gx-avatar-state-label">
              {presenceText(status)}
            </span>
          </span>
        ))}
        <span className="gx-avatar-state">
          <Disc name="Ada Lovelace" />
          <span className="gx-avatar-state-label">No presence shown</span>
        </span>
      </Run>

      <Run label="Sizes">
        {sizes.map((size) => (
          <span className="gx-avatar-state" key={size}>
            <Disc name="Grace Hopper" size={size} />
            <span className="gx-avatar-state-label">
              {size} · {avatarSize[size]}px
            </span>
          </span>
        ))}
      </Run>

      <Run label="Fallback edges">
        {edgeNames.map((name) => (
          <span className="gx-avatar-state" key={name}>
            <Disc name={name} />
            <span className="gx-avatar-state-label">{initialsFor(name)}</span>
          </span>
        ))}
      </Run>

      <Run label="Picture and fallback">
        <span className="gx-avatar-state">
          <Disc name="Ada Lovelace" src={portraitSrc} status="online" />
          <span className="gx-avatar-state-label">picture</span>
        </span>
        <span className="gx-avatar-state">
          <Disc name="Ada Lovelace" status="online" />
          <span className="gx-avatar-state-label">initials</span>
        </span>
      </Run>

      <p className="gx-avatar-foot">
        A dot is colour-only, so every presence state is printed beside its
        face. The fallback runs are the names the component&apos;s own table
        uses, including the placeholder a name with no letter gets.
      </p>
    </div>
  );
}

/** The workflow on the platform switch's theme. */
export const AvatarWorkflow = () => {
  const { look, platform } = usePlatform();
  return <AvatarWorkflowBody key={`${platform}-${look}`} />;
};

/** The states on the platform switch's theme. */
export const AvatarStates = () => {
  const { look, platform } = usePlatform();
  return <AvatarStatesBody key={`${platform}-${look}`} />;
};

const workflowSource = `import { Avatar } from "@gpuixui/components/avatar";

// A panel is app composition: the shipped Avatar draws one face, and the
// caller owns the roster, the filter and the invite gate.
<Avatar name="Ada Lovelace" src="/photos/ada.png" status="online" />;
<Avatar name="Grace Hopper" status="busy" size="sm" />;
<Avatar name="Alan Turing" />;`;

const statesSource = `import { Avatar } from "@gpuixui/components/avatar";

// The dot is colour-only, so print the state beside the face where it matters.
<Avatar name="Ada Lovelace" status="online" />
<Avatar name="Katherine Johnson" status="away" />
<Avatar name="Grace Hopper" status="busy" />
<Avatar name="Jean Bartik" status="offline" />

// Without a picture the initials are derived from the name.
<Avatar name="Alan Turing" size="lg" />
<Avatar name="🎨 Artist" size="xs" />;`;

export {
  statesSource as avatarStatesSource,
  workflowSource as avatarWorkflowSource,
};
