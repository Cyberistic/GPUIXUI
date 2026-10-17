import {
  bodyType,
  captionType,
  column,
  fieldRow,
  labelType,
  row,
  type PreviewProps,
} from "./preview-styles";
import { PreviewSurface } from "./theme-surface";

/**
 * Static rest previews for the status and identity surfaces (plan 449).
 *
 * Badge, Alert, Progress and Avatar paint no interaction at all, so a labelled
 * browser approximation can show their real token roles without implying a
 * native behaviour. Anything animated stays out: an animation frozen in a still
 * is a claim the preview cannot keep.
 */

interface BadgeLook {
  readonly background?: string;
  readonly foreground: string;
  readonly border?: string;
}

const badgeLooks: ReadonlyArray<{ readonly label: string } & BadgeLook> = [
  {
    label: "Neutral",
    background: "var(--preview-color-muted)",
    foreground: "var(--preview-color-mutedForeground)",
  },
  {
    label: "Primary",
    background: "var(--preview-color-primary)",
    foreground: "var(--preview-color-primaryForeground)",
  },
  {
    label: "Success",
    background: "var(--preview-color-successSoft)",
    foreground: "var(--preview-color-successSoftForeground)",
  },
  {
    label: "Warning",
    background: "var(--preview-color-warningSoft)",
    foreground: "var(--preview-color-warningSoftForeground)",
  },
  {
    label: "Danger",
    background: "var(--preview-color-destructiveSoft)",
    foreground: "var(--preview-color-destructiveSoftForeground)",
  },
  {
    label: "Info",
    background: "var(--preview-color-infoSoft)",
    foreground: "var(--preview-color-infoSoftForeground)",
  },
  {
    label: "Outline",
    foreground: "var(--preview-color-mutedForeground)",
    border: "var(--preview-color-border)",
  },
];

const badgeStyle = ({ background, foreground, border }: BadgeLook) => ({
  ...labelType,
  display: "inline-flex",
  alignItems: "center",
  alignSelf: "flex-start",
  whiteSpace: "nowrap",
  borderRadius: "var(--preview-radius-full)",
  padding: "var(--preview-space-2xs) var(--preview-space-md)",
  backgroundColor: background,
  color: foreground,
  border:
    border === undefined
      ? undefined
      : `var(--preview-border-thin) solid ${border}`,
});

export function BadgePreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={{ ...row, gap: "var(--preview-space-sm)" }}>
        {badgeLooks.map((look) => (
          <span key={look.label} style={badgeStyle(look)}>
            {look.label}
          </span>
        ))}
      </div>
    </PreviewSurface>
  );
}

export function AlertPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--preview-space-2xs)",
          maxWidth: "28rem",
          padding: "var(--preview-space-lg)",
          borderRadius: "var(--preview-radius-md)",
          border: "var(--preview-border-thin) solid var(--preview-color-info)",
          backgroundColor: "var(--preview-color-infoSoft)",
          color: "var(--preview-color-infoSoftForeground)",
        }}
      >
        <span style={{ ...labelType, fontWeight: 600 }}>
          Workspace archived
        </span>
        <div style={{ ...bodyType, color: "var(--preview-color-foreground)" }}>
          Members keep read access. Restore it any time from Settings.
        </div>
      </div>
    </PreviewSurface>
  );
}

const progressRows = [
  { label: "Uploading", value: 25, tone: "primary" },
  { label: "Indexing", value: 60, tone: "success" },
] as const;

function Bar({
  label,
  value,
  tone,
}: {
  readonly label: string;
  readonly value: number;
  readonly tone: "primary" | "success";
}) {
  return (
    <div style={fieldRow}>
      <div style={{ ...row, justifyContent: "space-between" }}>
        <span
          style={{ ...labelType, color: "var(--preview-color-foreground)" }}
        >
          {label}
        </span>
        <span style={captionType}>{value}%</span>
      </div>
      <div
        style={{
          width: "100%",
          height: "var(--preview-space-sm)",
          borderRadius: "var(--preview-radius-full)",
          backgroundColor: "var(--preview-color-muted)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${value}%`,
            height: "100%",
            borderRadius: "var(--preview-radius-full)",
            backgroundColor: `var(--preview-color-${tone})`,
          }}
        />
      </div>
    </div>
  );
}

export function ProgressPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={{ ...column, maxWidth: "22rem" }}>
        {progressRows.map((item) => (
          <Bar
            key={item.label}
            label={item.label}
            value={item.value}
            tone={item.tone}
          />
        ))}
      </div>
    </PreviewSurface>
  );
}

/**
 * The real component's diameters. Tokens ship no avatar scale yet (recorded as
 * an interlock in `TODO.md`), so mirroring the package's own millimetres is the
 * honest depiction until that scale lands.
 */
const avatars = [
  { name: "Ada Lovelace", initials: "AL", diameter: 20, status: "online" },
  { name: "Jean Sammet", initials: "JS", diameter: 26, status: "away" },
  { name: "Margaret Hamilton", initials: "MH", diameter: 32, status: "busy" },
  { name: "Radia Perlman", initials: "RP", diameter: 40, status: "offline" },
] as const;

const dotFill: Readonly<Record<(typeof avatars)[number]["status"], string>> = {
  online: "var(--preview-color-success)",
  away: "var(--preview-color-warning)",
  busy: "var(--preview-color-destructive)",
  offline: "var(--preview-color-mutedForeground)",
};

export function AvatarPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div
        style={{
          ...row,
          alignItems: "flex-start",
          gap: "var(--preview-space-lg)",
        }}
      >
        {avatars.map((avatar) => (
          <div
            key={avatar.name}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "var(--preview-space-2xs)",
            }}
          >
            <div
              style={{
                position: "relative",
                display: "flex",
                width: avatar.diameter,
                height: avatar.diameter,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: "100%",
                  borderRadius: "var(--preview-radius-full)",
                  backgroundColor: "var(--preview-color-muted)",
                  color: "var(--preview-color-foreground)",
                  fontSize: Math.round(avatar.diameter * 0.4),
                }}
              >
                {avatar.initials}
              </div>
              <span
                style={{
                  position: "absolute",
                  right: 0,
                  bottom: 0,
                  width: 10,
                  height: 10,
                  boxSizing: "border-box",
                  borderRadius: "var(--preview-radius-full)",
                  border: "2px solid var(--preview-color-background)",
                  backgroundColor: dotFill[avatar.status],
                }}
              />
            </div>
            <span
              style={{ ...captionType, maxWidth: "4rem", textAlign: "center" }}
            >
              {avatar.name}
            </span>
          </div>
        ))}
      </div>
    </PreviewSurface>
  );
}
