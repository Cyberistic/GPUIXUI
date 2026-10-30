import type { TextRole, Theme } from "@gpuixui/tokens";
import { platformLabel } from "../../lib/platform";
import { PreviewSurface } from "./preview-surface";
import { usePlatform } from "./platform-toggle";

/**
 * The type scale, drawn from the theme rather than copied.
 *
 * Every row carries the resolved size, leading and weight of a role and the
 * sentence a reader should use it for. The guidance list is the only place the
 * roles are enumerated, and `type-scale.test.tsx` holds it to the theme, so a
 * role added to `@gpuixui/tokens` fails the docs until it is described here.
 */

/** The roles a component may name, with what each is for. */
export const roleGuidance = [
  {
    role: "display",
    sample: "GPUIxUI",
    use: "A landing or empty-state headline. One per screen.",
  },
  {
    role: "h1",
    sample: "Native components for desktop",
    use: "The page title. The docs site's own heading is this role.",
  },
  {
    role: "h2",
    sample: "Typography is data",
    use: "A section heading, and the level a long page repeats.",
  },
  {
    role: "h3",
    sample: "A subsection that carries weight",
    use: "A card title or a subsection under an h2.",
  },
  {
    role: "body",
    sample: "Every size, leading and weight here comes from the theme.",
    use: "Running text — the default role of Text.",
  },
  {
    role: "bodyStrong",
    sample: "A lead sentence is body-sized, only heavier.",
    use: "The first sentence of a section, or a value in a definition list.",
  },
  {
    role: "label",
    sample: "Project name",
    use: "A control's visible name, or a compact toolbar action.",
  },
  {
    role: "caption",
    sample: "Updated 2 minutes ago",
    use: "Metadata and helper text, usually in the muted tone.",
  },
  {
    role: "code",
    sample: "nub add @gpuixui/primitives",
    use: "An identifier, command or path inside a sentence. Monospace.",
  },
  {
    role: "codeBlock",
    sample: "const theme = themes.dark;",
    use: "A block of code or terminal output. Monospace.",
  },
] as const satisfies ReadonlyArray<{
  readonly role: TextRole;
  readonly sample: string;
  readonly use: string;
}>;

/** Roles painted in the mono family. */
const monoRoles: ReadonlyArray<TextRole> = ["code", "codeBlock"];

/** The specimen rows, given a resolved theme (no context, so it is testable). */
export function TypeScaleBody({ theme }: { readonly theme: Theme }) {
  return (
    <div className="gx-type-list">
      {roleGuidance.map(({ role, sample, use }) => {
        const style = theme.typography[role];
        return (
          <div className="gx-type-row" key={role}>
            <span className="gx-type-meta">
              {role}
              <br />
              {style.fontSize}/{style.lineHeight} · {style.fontWeight}
            </span>
            <div className="gx-type-cell">
              <p
                className="gx-type-sample"
                style={{
                  fontFamily: monoRoles.includes(role)
                    ? "var(--font-mono)"
                    : "var(--font-sans)",
                  fontSize: style.fontSize,
                  fontWeight: style.fontWeight,
                  lineHeight: `${style.lineHeight}px`,
                }}
              >
                {sample}
              </p>
              <p className="gx-type-use">{use}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** The specimen on the platform surface, so the families follow the switch. */
export function TypeScale() {
  const { platform, theme } = usePlatform();

  return (
    <PreviewSurface className="gx-type-scale">
      <TypeScaleBody theme={theme} />
      <div className="gx-type-tones">
        <span className="gx-type-tone">Default (foreground)</span>
        <span className="gx-type-tone" data-tone="muted">
          Muted (metadata)
        </span>
        <span className="gx-type-tone" data-tone="primary">
          Primary (link-like)
        </span>
        <span className="gx-type-tone" data-tone="destructive">
          Destructive (error)
        </span>
      </div>
      <p className="gx-type-note">
        Browser preview of the {platformLabel(platform)} theme: the metrics are
        the token values and the families are that platform's. The shipped Text
        renders through GPUix, not the DOM.
      </p>
    </PreviewSurface>
  );
}
