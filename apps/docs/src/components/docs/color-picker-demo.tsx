/**
 * Browser previews for the Color picker page.
 *
 * The shipped picker is a named group: a swatch grid whose cells are each their
 * own tab stop, a real `<input>` for the hex value, and a preview of the
 * committed colour. The preview cannot mount it (the library renders through
 * GPUix), so it mirrors the contract with HTML and says so: a swatch press
 * commits at once, a typed value commits on `Enter` or blur, an invalid draft
 * paints the `destructive` edge and reverts instead of reaching the value, and
 * the chosen cell carries the component's two-tone pip.
 *
 * The rules live in `color-picker-preview.ts` so a test can fail on them; this
 * file only renders them. The Code tab always shows the native usage.
 */

import type { Theme } from "@gpuixui/tokens";
import { useState, type ReactNode } from "react";
import {
  brandSwatches,
  chosenRole,
  choose,
  commit,
  defaultSwatches,
  describe,
  isDraftValid,
  normalizeHex,
  sameHex,
  type Swatch,
} from "./color-picker-preview";
import { usePlatform } from "./platform-toggle";

interface PickerProps {
  readonly disabled?: boolean;
  /** The committed colour. */
  readonly value: string;
  /** The field's current text; may be invalid. */
  readonly draft?: string;
  readonly label: string;
  readonly onChoose?: (swatch: Swatch) => void;
  readonly onCommit?: () => void;
  readonly onDraft?: (draft: string) => void;
  readonly swatches: ReadonlyArray<Swatch>;
}

/**
 * The picker's markup, with no state: the workflow supplies the handlers and
 * the states preview renders it as a still.
 */
const Picker = ({
  disabled = false,
  value,
  draft,
  label,
  onChoose,
  onCommit,
  onDraft,
  swatches,
}: PickerProps) => {
  const text = draft ?? value;
  const valid = isDraftValid(text);

  return (
    <div
      aria-label={label}
      className="gx-color-picker"
      data-disabled={disabled ? "" : undefined}
      role="group"
    >
      <div className="gx-color-grid">
        {swatches.map((swatch) => {
          const selected = sameHex(swatch.value, value);
          return (
            <button
              aria-label={swatch.value}
              aria-selected={selected}
              className="gx-color-swatch"
              data-role={swatch.role}
              key={swatch.role}
              onClick={() => {
                if (!disabled) onChoose?.(swatch);
              }}
              style={{ backgroundColor: swatch.value }}
              tabIndex={disabled ? -1 : 0}
              type="button"
            >
              {/* The pip carries the page fill inside the body ink, so a swatch
                  that swallows the `foreground` edge still shows the mark. */}
              {selected ? <span className="gx-color-pip" /> : null}
            </button>
          );
        })}
      </div>
      <div className="gx-color-field">
        <span
          aria-hidden="true"
          className="gx-color-preview"
          style={{ backgroundColor: normalizeHex(value) ?? "var(--muted)" }}
        />
        <input
          aria-description={valid ? undefined : "Invalid hex colour"}
          aria-label={`${label} hex value`}
          className="gx-color-input"
          data-invalid={valid ? undefined : ""}
          onBlur={onCommit}
          onChange={(event) => onDraft?.(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onCommit?.();
          }}
          readOnly={disabled}
          value={text}
        />
      </div>
    </div>
  );
};

/** A deploy-style workflow: the app owns the value, the picker reports it. */
export function ColorPickerWorkflowBody({ theme }: { readonly theme: Theme }) {
  const swatches = defaultSwatches(theme);
  const [value, setValue] = useState<string>(swatches[0]?.value ?? "#000000");
  const [draft, setDraft] = useState<string>(swatches[0]?.value ?? "#000000");
  const chosen = chosenRole(swatches, value);

  const chooseSwatch = (swatch: Swatch): void => {
    const next = choose(swatch.value, value);
    setValue(next.value);
    setDraft(next.draft);
  };

  const commitDraft = (): void => {
    const next = commit(draft, value);
    setValue(next.value);
    setDraft(next.draft);
  };

  return (
    <div className="gx-demo gx-demo-column gx-color-scene">
      <p className="gx-demo-label">Accent colour</p>
      <div className="gx-color-card">
        <Picker
          draft={draft}
          label="Accent colour"
          onChoose={chooseSwatch}
          onCommit={commitDraft}
          onDraft={setDraft}
          swatches={swatches}
          value={value}
        />
        <div className="gx-color-readout" role="status">
          {describe(value, draft)}
        </div>
        <div className="gx-color-chosen-row">
          <span
            aria-hidden="true"
            className="gx-color-chosen"
            style={{ backgroundColor: normalizeHex(value) ?? "var(--muted)" }}
          />
          <span className="gx-color-chosen-label">
            Chosen <code>{value}</code>
            {chosen === undefined ? " · custom" : ` · ${chosen}`}
          </span>
        </div>
        <p className="gx-color-note">
          A swatch press commits at once; a typed value commits on{" "}
          <kbd>Enter</kbd> or when the field loses focus. An invalid draft is
          marked with the <code>destructive</code> edge and reverts on commit,
          so <code>value</code> never holds something the picker cannot paint.
          The preview starts on the theme&rsquo;s <code>primary</code>, so the
          platform switch repaints the six defaults and the mark follows the
          same colour.
        </p>
      </div>
    </div>
  );
}

/** The workflow on the platform surface, so the switch repaints it. */
export const ColorPickerWorkflow = () => {
  const { look, platform, theme } = usePlatform();
  // A switch starts the preview again on the new theme's primary, so the mark
  // follows the colour the reader just selected rather than a stale hex.
  return <ColorPickerWorkflowBody key={`${platform}-${look}`} theme={theme} />;
};

/** One labelled state, as the states preview draws it. */
const StateGroup = ({
  children,
  label,
}: {
  readonly children: ReactNode;
  readonly label: string;
}) => (
  <div aria-label={label} className="gx-color-state" role="group">
    <p className="gx-color-state-label">{label}</p>
    {children}
  </div>
);

/** Rest, a caller's palette, an invalid draft and the disabled picker. */
export function ColorPickerStatesBody({ theme }: { readonly theme: Theme }) {
  const defaults = defaultSwatches(theme);

  return (
    <div className="gx-demo gx-demo-column gx-color-scene">
      <StateGroup label="Rest — the theme primary is chosen">
        <Picker
          label="Accent colour"
          swatches={defaults}
          value={theme.colors.primary}
        />
      </StateGroup>
      <StateGroup label="A custom palette — the swatches are not theme roles">
        <Picker
          label="Brand colour"
          swatches={brandSwatches}
          value={brandSwatches[1]?.value ?? "#2563eb"}
        />
      </StateGroup>
      <StateGroup label="An invalid draft — destructive edge, committed value kept">
        <Picker
          draft="zzz"
          label="Accent colour"
          swatches={defaults}
          value={theme.colors.accent}
        />
      </StateGroup>
      <StateGroup label="Disabled — out of the tab order and read-only">
        <Picker
          disabled
          label="Accent colour"
          swatches={defaults}
          value={theme.colors.secondary}
        />
      </StateGroup>
      <p className="gx-color-note">
        The six defaults are theme roles, so a platform switch repaints them; a
        caller&rsquo;s palette keeps its own colours. The chosen mark is the
        strong <code>foreground</code> edge plus the pip — the page fill inside
        the body ink — because <code>foreground</code> is one of the six
        defaults and a ring alone disappears into it. For the six defaults the
        component&rsquo;s own suite measures the best of the three marks on
        every swatch in both shipped themes; a custom palette is the
        caller&rsquo;s to check.
      </p>
    </div>
  );
}

/** The states on the platform surface, so the switch repaints them. */
export const ColorPickerStates = () => {
  const { theme } = usePlatform();
  return <ColorPickerStatesBody theme={theme} />;
};

export const colorPickerWorkflowSource = `import { useState } from "react";
import { ColorPicker } from "@gpuixui/components";

export const AccentField = () => {
  // The picker reports; the app owns the value it reports into.
  const [accent, setAccent] = useState("#5f4bdb");

  return (
    <>
      <ColorPicker
        label="Accent colour"
        onValueChange={setAccent}
        value={accent}
      />
      <p>
        Chosen <code>{accent}</code>
      </p>
    </>
  );
};`;

export const colorPickerStatesSource = `import { ColorPicker } from "@gpuixui/components";

<>
  {/* The defaults are six theme roles: primary, secondary, accent, muted,
      destructive and foreground. */}
  <ColorPicker defaultValue="#5f4bdb" label="Accent colour" />

  {/* A caller's list replaces the grid whole. */}
  <ColorPicker
    defaultValue="#2563eb"
    label="Brand colour"
    swatches={["#0f172a", "#2563eb", "#0d9488", "#d97706"]}
  />

  {/* Disabled leaves the tab order, makes the field read-only and fades the
      whole picker; 0.11.0 has no aria-disabled attribute. */}
  <ColorPicker defaultValue="#5f4bdb" disabled label="Accent colour" />;
</>;`;
