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

const portraitSrc = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#4F46E5"/><circle cx="16" cy="12" r="6" fill="#E0E7FF"/><path d="M4 32c0-7 5.4-12 12-12s12 5 12 12z" fill="#E0E7FF"/></svg>`,
)}`;

interface DiscProps {
  readonly name: string;
  readonly src?: string;
  readonly size?: Size;
  readonly status?: Presence;
}

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

export const AvatarDisc = Disc;

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
          className={`gx-btn gx-btn-sm ${onlineOnly ? "gx-btn-secondary" : "gx-btn-outline"}`}
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
          className="gx-btn gx-btn-sm gx-btn-secondary"
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
    </div>
  );
}

export function AvatarStatesBody() {
  const edgeNames = [
    "Grace Brewster Murray Hopper",
    "  Ada   Lovelace  ",
    "-",
    "🎨🎨 Ada",
  ] as const;

  return (
    <div className="gx-avatar-states">
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
    </div>
  );
}

export const AvatarWorkflow = () => {
  const { look, platform } = usePlatform();
  return <AvatarWorkflowBody key={`${platform}-${look}`} />;
};

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
