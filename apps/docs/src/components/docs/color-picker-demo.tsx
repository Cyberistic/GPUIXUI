/**
 * Browser previews for the Color picker page.
 *
 * The site cannot mount a GPUix component, so these drawings mirror the shipped
 * picker with HTML: the trigger swatch, the panel, the three-layer
 * saturation/value area, the six-ramp hue rail, the alpha rail, the hex field,
 * the contrast readout and the preset row. The rules — the hex grammar, the
 * commit, the contrast — live in `color-picker-preview.ts`, and
 * `color-picker-drawing.test.tsx` holds the style sheet to the component's own
 * recipes through `classesToStyle`.
 *
 * The drawing uses a checkerless alpha rail for the same reason the component
 * does: the runtime has no repeating gradient.
 */

import type { Theme } from "@gpuixui/tokens";
import { useState, type ReactNode } from "react";
import {
  alphaRamp,
  areaLayers,
  brandSwatches,
  chosenRole,
  choose,
  composite,
  contrast,
  defaultSwatches,
  describe,
  grade,
  hueSegment,
  opaqueHex,
  parseHex,
  sameColour,
  toHex,
  type Hsva,
  type Swatch,
} from "./color-picker-preview";
import { usePlatform } from "./platform-toggle";

/** The panel's width and the area's height, as the component draws them. */
const PANEL_WIDTH = 304;
const AREA_HEIGHT = 148;
const THUMB = 20;

const percent = (fraction: number): string => `${fraction * 100}%`;

const rgbCss = ({
  r,
  g,
  b,
}: {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}): string =>
  `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;

interface PanelProps {
  readonly label: string;
  readonly hsva: Hsva;
  readonly draft: string;
  readonly invalid: boolean;
  readonly background: string;
  readonly swatches: ReadonlyArray<Swatch>;
  readonly disabled?: boolean;
  readonly onDraft?: (draft: string) => void;
  readonly onCommit?: () => void;
  readonly onHue?: (hue: number) => void;
  readonly onAlpha?: (alpha: number) => void;
  readonly onArea?: (saturation: number, value: number) => void;
  readonly onPreset?: (swatch: Swatch) => void;
}

/** A rail's thumb, placed by the fraction it reports. */
const RailThumb = ({
  fill,
  fraction,
}: {
  readonly fill: string;
  readonly fraction: number;
}) => (
  <span
    className="gx-cp-thumb gx-cp-rail-thumb"
    style={{ left: percent(fraction), background: fill }}
  />
);

/** The panel, with no state of its own. */
const Panel = ({
  label,
  hsva,
  draft,
  invalid,
  background,
  swatches,
  disabled = false,
  onDraft,
  onCommit,
  onHue,
  onAlpha,
  onArea,
  onPreset,
}: PanelProps) => {
  const hex = toHex(hsva);
  const mixed = composite(
    hsva,
    parseHex(background) ?? { h: 0, s: 0, v: 1, a: 1 },
  );
  const ratio = contrast(hsva, background);
  const value = grade(ratio ?? 1);

  return (
    <div
      aria-label={`${label} colour`}
      className="gx-cp-panel"
      data-disabled={disabled ? "" : undefined}
      role="dialog"
      style={{ width: `min(${PANEL_WIDTH}px, 100vw - 32px)` }}
    >
      <div className="gx-cp-head">
        <span
          aria-hidden="true"
          className="gx-cp-chip"
          style={{ background: hex }}
        />
        <span className="gx-cp-trigger-text">
          <span className="gx-cp-name">{label}</span>
          <span className="gx-cp-hex">{hex}</span>
        </span>
        <button aria-label="Done" className="gx-cp-icon" type="button">
          ✓
        </button>
      </div>

      <div
        aria-label={`${label} saturation and brightness`}
        aria-valuetext={`Saturation ${Math.round(hsva.s * 100)}%, brightness ${Math.round(hsva.v * 100)}%`}
        className="gx-cp-area"
        onPointerDown={(event) => {
          if (disabled || onArea === undefined) return;
          const box = event.currentTarget.getBoundingClientRect();
          onArea(
            Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)),
            1 -
              Math.min(1, Math.max(0, (event.clientY - box.top) / box.height)),
          );
        }}
        role="slider"
        style={{
          height: AREA_HEIGHT,
          background: `hsl(${hsva.h} 100% 50%)`,
        }}
        tabIndex={disabled ? -1 : 0}
      >
        {areaLayers.map((layer) => (
          <span
            aria-hidden="true"
            className="gx-cp-area-layer"
            key={layer}
            style={{ background: layer }}
          />
        ))}
        <span
          aria-hidden="true"
          className="gx-cp-thumb"
          style={{
            left: percent(hsva.s),
            top: percent(1 - hsva.v),
            width: THUMB,
            height: THUMB,
            background: opaqueHex(hsva),
          }}
        />
      </div>

      <div className="gx-cp-row">
        <div
          aria-label={`${label} hue`}
          aria-valuetext={`${Math.round(hsva.h)} degrees`}
          className="gx-cp-track"
          onPointerDown={(event) => {
            if (disabled || onHue === undefined) return;
            const box = event.currentTarget.getBoundingClientRect();
            onHue(
              Math.round(
                Math.min(
                  1,
                  Math.max(0, (event.clientX - box.left) / box.width),
                ) * 360,
              ) % 360,
            );
          }}
          role="slider"
          tabIndex={disabled ? -1 : 0}
        >
          <span className="gx-cp-rail">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <span
                aria-hidden="true"
                className="gx-cp-segment"
                key={index}
                style={{ background: hueSegment(index) }}
              />
            ))}
          </span>
          <RailThumb
            fill={opaqueHex({ ...hsva, s: 1, v: 1 })}
            fraction={hsva.h / 360}
          />
        </div>
      </div>

      <div className="gx-cp-row">
        <div
          aria-label={`${label} opacity`}
          aria-valuetext={`${Math.round(hsva.a * 100)}%`}
          className="gx-cp-track"
          onPointerDown={(event) => {
            if (disabled || onAlpha === undefined) return;
            const box = event.currentTarget.getBoundingClientRect();
            onAlpha(
              Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)),
            );
          }}
          role="slider"
          tabIndex={disabled ? -1 : 0}
        >
          <span
            aria-hidden="true"
            className="gx-cp-rail"
            style={{ background: alphaRamp(hsva) }}
          />
          <RailThumb fill={opaqueHex(hsva)} fraction={hsva.a} />
        </div>
      </div>

      <div className="gx-cp-field">
        <input
          aria-description={invalid ? "Invalid hex colour" : undefined}
          aria-label={`${label} hex value`}
          aria-invalid={invalid || undefined}
          className="gx-cp-input"
          data-invalid={invalid ? "" : undefined}
          onBlur={onCommit}
          onChange={(event) => onDraft?.(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onCommit?.();
          }}
          readOnly={disabled}
          spellCheck={false}
          value={draft}
        />
      </div>
      {invalid ? (
        <p className="gx-cp-error" role="status">
          Enter a hex colour, such as #2F6BFF or #2F6BFF80
        </p>
      ) : undefined}

      <div className="gx-cp-contrast">
        <span
          aria-hidden="true"
          className="gx-cp-sample"
          style={{ background, color: rgbCss(mixed) }}
        >
          Aa
        </span>
        <span className="gx-cp-ratio">{(ratio ?? 1).toFixed(2)}:1</span>
        <span className="gx-cp-against">against background</span>
        <span
          className="gx-cp-grade"
          data-grade={
            value === "Fails" ? "fail" : value === "AA large" ? "large" : "pass"
          }
        >
          {value}
        </span>
      </div>

      <div aria-label="Preset colours" className="gx-cp-presets" role="group">
        {swatches.map((swatch) => {
          const selected = sameColour(swatch.value, hex);
          return (
            <button
              aria-label={swatch.value}
              aria-selected={selected}
              className="gx-cp-preset"
              data-current={selected ? "" : undefined}
              disabled={disabled}
              key={swatch.role}
              onClick={() => onPreset?.(swatch)}
              style={{ background: swatch.value }}
              type="button"
            >
              {selected ? (
                <span aria-hidden="true" className="gx-cp-pip" />
              ) : undefined}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/** The trigger: the swatch, the label and the current hex. */
const Trigger = ({
  label,
  hsva,
  open,
  disabled = false,
  onToggle,
}: {
  readonly label: string;
  readonly hsva: Hsva;
  readonly open: boolean;
  readonly disabled?: boolean;
  readonly onToggle?: () => void;
}) => (
  <button
    aria-expanded={open}
    aria-haspopup="dialog"
    className="gx-cp-trigger"
    disabled={disabled}
    onClick={onToggle}
    type="button"
  >
    <span
      aria-hidden="true"
      className="gx-cp-chip"
      style={{ background: toHex(hsva) }}
    />
    <span className="gx-cp-trigger-text">
      <span className="gx-cp-name">{label}</span>
      <span className="gx-cp-hex">{toHex(hsva)}</span>
    </span>
  </button>
);

/** A deploy-style workflow: the app owns the value, the picker reports it. */
export function ColorPickerWorkflowBody({ theme }: { readonly theme: Theme }) {
  const swatches = defaultSwatches(theme);
  const start = parseHex(swatches[0]?.value ?? "#2F6BFF") ?? {
    h: 220,
    s: 0.8,
    v: 1,
    a: 1,
  };
  const [hsva, setHsva] = useState<Hsva>(start);
  const [value, setValue] = useState<string>(toHex(start));
  const [draft, setDraft] = useState<string>(toHex(start));
  const [invalid, setInvalid] = useState(false);
  const [open, setOpen] = useState(true);
  const chosen = chosenRole(swatches, value);

  const apply = (next: Hsva): void => {
    setHsva(next);
    setValue(toHex(next));
    setDraft(toHex(next));
    setInvalid(false);
  };

  const commitDraft = (): void => {
    const parsed = parseHex(draft, hsva.h);
    if (parsed === undefined) {
      setInvalid(true);
      return;
    }
    apply(parsed);
  };

  return (
    <div className="gx-demo gx-demo-column gx-cp-scene">
      <p className="gx-demo-label">Accent colour</p>
      <div className="gx-cp-card">
        <Trigger
          hsva={hsva}
          label="Accent colour"
          open={open}
          onToggle={() => setOpen((current) => !current)}
        />
        {open ? (
          <Panel
            background={theme.colors.background}
            draft={draft}
            hsva={hsva}
            invalid={invalid}
            label="Accent colour"
            onAlpha={(alpha) => apply({ ...hsva, a: alpha })}
            onArea={(saturation, brightness) =>
              apply({ ...hsva, s: saturation, v: brightness })
            }
            onCommit={commitDraft}
            onDraft={(next) => {
              setDraft(next);
              setInvalid(false);
            }}
            onHue={(hue) => apply({ ...hsva, h: hue })}
            onPreset={(swatch) => {
              const next = choose(swatch.value, value, hsva.h);
              const parsed = parseHex(next.value, hsva.h);
              if (parsed !== undefined) apply(parsed);
            }}
            swatches={swatches}
          />
        ) : undefined}
        <div className="gx-cp-readout" role="status">
          {describe(value, draft)}
        </div>
        <div className="gx-cp-chosen-row">
          <span
            aria-hidden="true"
            className="gx-cp-chosen"
            style={{ background: value }}
          />
          <span className="gx-cp-chosen-label">
            Chosen <code>{value}</code>
            {chosen === undefined ? " · custom" : ` · ${chosen}`}
          </span>
        </div>
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
  <div aria-label={label} className="gx-cp-state" role="group">
    <p className="gx-cp-state-label">{label}</p>
    {children}
  </div>
);

/** An open panel on a preset, a refused draft, and a closed disabled trigger. */
export function ColorPickerStatesBody({ theme }: { readonly theme: Theme }) {
  const defaults = defaultSwatches(theme);
  const start = parseHex(theme.colors.primary) ?? {
    h: 220,
    s: 0.8,
    v: 1,
    a: 1,
  };
  const accent = parseHex(theme.colors.accent) ?? start;

  return (
    <div className="gx-demo gx-demo-column gx-cp-scene">
      <StateGroup label="Open — the theme primary is chosen">
        <Panel
          background={theme.colors.background}
          draft={toHex(start)}
          hsva={start}
          invalid={false}
          label="Accent colour"
          swatches={defaults}
        />
      </StateGroup>
      <StateGroup label="A refused draft — destructive edge, committed value kept">
        <Panel
          background={theme.colors.background}
          draft="zzz"
          hsva={accent}
          invalid
          label="Brand colour"
          swatches={brandSwatches}
        />
      </StateGroup>
      <StateGroup label="Closed — the trigger reports the value and the colour">
        <Trigger hsva={accent} label="Accent colour" open={false} />
        <Trigger disabled hsva={accent} label="Locked colour" open={false} />
      </StateGroup>
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
  const [accent, setAccent] = useState("#2F6BFF");

  return (
    <>
      <ColorPicker
        label="Accent colour"
        background="#FFFFFF"
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
  <ColorPicker defaultValue="#2F6BFF" label="Accent colour" />

  {/* A caller's palette replaces the row whole; the alpha digits are part of
      the value when the colour is not opaque. */}
  <ColorPicker
    defaultValue="#2563EBCC"
    label="Brand colour"
    swatches={["#0F172A", "#2563EB", "#0D9488", "#D97706"]}
  />

  {/* Disabled leaves the tab order and paints the trigger faded. */}
  <ColorPicker defaultValue="#2F6BFF" disabled label="Accent colour" />;
</>;`;
