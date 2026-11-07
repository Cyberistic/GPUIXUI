import type { Theme } from "@gpuixui/tokens";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  alphaRamp,
  areaFractions,
  areaLayers,
  brandSwatches,
  chosenRole,
  choose,
  composite,
  contrast,
  defaultSwatches,
  grade,
  hueAt,
  hueSegment,
  opaqueHex,
  parseHex,
  railFraction,
  sameColour,
  toHex,
  type Hsva,
  type Swatch,
} from "./color-picker-preview";
import { usePlatform } from "./platform-toggle";

const PANEL_WIDTH = 304;
const AREA_HEIGHT = 148;
const THUMB = 20;

const PANEL_EXIT_MS = 320;

const percent = (fraction: number): string => `${fraction * 100}%`;

const useRailDrag = <T,>(
  read: (
    box: DOMRect,
    pointer: { readonly clientX: number; readonly clientY: number },
  ) => T,
  onValue: (value: T) => void,
) => {
  const dragging = useRef(false);

  const handle = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const element = event.currentTarget;
      if (event.buttons === 0 && dragging.current) {
        dragging.current = false;
        try {
          element.releasePointerCapture?.(event.pointerId);
        } catch {}
        return;
      }
      if (!dragging.current) return;
      onValue(read(element.getBoundingClientRect(), event));
    },
    [onValue, read],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      dragging.current = true;

      onValue(read(event.currentTarget.getBoundingClientRect(), event));
      try {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      } catch {}
    },
    [onValue, read],
  );

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    dragging.current = false;
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {}
  }, []);

  return { onPointerDown, onPointerMove: handle, onPointerUp };
};

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

  readonly open?: boolean;

  readonly onAnimationEnd?: () => void;
  readonly onDraft?: (draft: string) => void;
  readonly onCommit?: () => void;
  readonly onHue?: (hue: number) => void;
  readonly onAlpha?: (alpha: number) => void;
  readonly onArea?: (saturation: number, value: number) => void;
  readonly onPreset?: (swatch: Swatch) => void;
}

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

const Panel = ({
  label,
  hsva,
  draft,
  invalid,
  background,
  swatches,
  disabled = false,
  open = true,
  onAnimationEnd,
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

  const readArea = useCallback(
    (
      box: DOMRect,
      pointer: { readonly clientX: number; readonly clientY: number },
    ) => areaFractions(pointer, box),
    [],
  );
  const areaDrag = useRailDrag(readArea, (point) => {
    if (disabled || onArea === undefined) return;
    onArea(point.saturation, point.brightness);
  });

  const readRail = useCallback(
    (
      box: DOMRect,
      pointer: { readonly clientX: number; readonly clientY: number },
    ) => railFraction(pointer.clientX, box),
    [],
  );
  const hueDrag = useRailDrag(readRail, (fraction) => {
    if (disabled || onHue === undefined) return;
    onHue(hueAt(fraction));
  });
  const alphaDrag = useRailDrag(readRail, (fraction) => {
    if (disabled || onAlpha === undefined) return;
    onAlpha(fraction);
  });

  return (
    <div
      aria-label={`${label} colour`}
      className="gx-cp-panel"
      data-disabled={disabled ? "" : undefined}
      data-open={open ? "true" : "false"}
      onAnimationEnd={onAnimationEnd}
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
        onPointerDown={areaDrag.onPointerDown}
        onPointerMove={areaDrag.onPointerMove}
        onPointerUp={areaDrag.onPointerUp}
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
          onPointerDown={hueDrag.onPointerDown}
          onPointerMove={hueDrag.onPointerMove}
          onPointerUp={hueDrag.onPointerUp}
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
          onPointerDown={alphaDrag.onPointerDown}
          onPointerMove={alphaDrag.onPointerMove}
          onPointerUp={alphaDrag.onPointerUp}
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

const usePanelPresence = (open: boolean) => {
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMounted(false);
      return;
    }

    const timer = window.setTimeout(() => setMounted(false), PANEL_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  return {
    mounted,

    onAnimationEnd: () => {
      if (!open) setMounted(false);
    },
  };
};

const ClosedPicker = ({ theme }: { readonly theme: Theme }) => {
  const swatches = defaultSwatches(theme);
  const [hsva] = useState<Hsva>(
    () => parseHex("#2F6BFF") ?? { h: 220, s: 0.8, v: 1, a: 1 },
  );
  const [open, setOpen] = useState(false);
  const panel = usePanelPresence(open);

  return (
    <div className="gx-cp-closed">
      <Trigger
        hsva={hsva}
        label="Accent colour"
        open={open}
        onToggle={() => setOpen((current) => !current)}
      />
      <div className="gx-cp-panel-slot">
        {panel.mounted ? (
          <Panel
            background={theme.colors.background}
            draft={toHex(hsva)}
            hsva={hsva}
            invalid={false}
            label="Accent colour"
            onAnimationEnd={panel.onAnimationEnd}
            open={open}
            swatches={swatches}
          />
        ) : null}
      </div>
    </div>
  );
};

export function ColorPickerWorkflowBody({
  theme,
  initiallyOpen = true,
  label = "Accent colour",
  defaultValue,
  onValueChange,
  portal = false,
}: {
  readonly theme: Theme;

  readonly initiallyOpen?: boolean;
  readonly label?: string;

  readonly defaultValue?: string;

  readonly onValueChange?: (value: string) => void;

  readonly portal?: boolean;
}) {
  const swatches = defaultSwatches(theme);
  const start = parseHex(defaultValue ?? swatches[0]?.value ?? "#2F6BFF") ?? {
    h: 220,
    s: 0.8,
    v: 1,
    a: 1,
  };
  const [hsva, setHsva] = useState<Hsva>(start);
  const [value, setValue] = useState<string>(toHex(start));
  const [draft, setDraft] = useState<string>(toHex(start));
  const [invalid, setInvalid] = useState(false);
  const [open, setOpen] = useState(initiallyOpen);
  const panel = usePanelPresence(open);
  const chosen = chosenRole(swatches, value);
  const anchor = useRef<HTMLDivElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const [portalAt, setPortalAt] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!portal || !panel.mounted) return;
    const update = (): void => {
      const rect = anchor.current?.getBoundingClientRect();
      if (rect === undefined) return;
      const width = Math.min(PANEL_WIDTH, window.innerWidth - 32);
      setPortalAt({
        top: rect.bottom + window.scrollY + 8,
        left: Math.min(
          rect.left + window.scrollX,
          window.scrollX + window.innerWidth - width - 16,
        ),
      });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [panel.mounted, portal]);

  useEffect(() => {
    if (!portal || !open) return;
    const onPointer = (event: PointerEvent): void => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (anchor.current?.contains(target)) return;
      if (popover.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, portal]);

  const apply = (next: Hsva): void => {
    const hex = toHex(next);
    setHsva(next);
    setValue(hex);
    setDraft(hex);
    setInvalid(false);
    onValueChange?.(hex);
  };

  const commitDraft = (): void => {
    const parsed = parseHex(draft, hsva.h);
    if (parsed === undefined) {
      setInvalid(true);
      return;
    }
    apply(parsed);
  };

  const panelBody = panel.mounted ? (
    <Panel
      background={theme.colors.background}
      draft={draft}
      hsva={hsva}
      invalid={invalid}
      label={label}
      open={open}
      onAnimationEnd={panel.onAnimationEnd}
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
  ) : null;

  return (
    <div className="gx-demo gx-demo-column gx-cp-scene">
      <p className="gx-demo-label">{label}</p>
      <div className="gx-cp-card">
        <div className="gx-cp-anchor" ref={anchor}>
          <Trigger
            hsva={hsva}
            label={label}
            open={open}
            onToggle={() => setOpen((current) => !current)}
          />
          {portal ? null : <div className="gx-cp-panel-slot">{panelBody}</div>}
        </div>
        <div className="gx-cp-readout" role="status">
          {draft === value
            ? `Committed ${value}.`
            : `Draft ${draft} — ${parseHex(draft, hsva.h) === undefined ? "not a hex colour yet" : "ready to commit"}.`}
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
      {portal && panelBody !== null && portalAt !== null
        ? createPortal(
            <div
              className="gx-cp-panel-portal"
              ref={popover}
              style={{ top: portalAt.top, left: portalAt.left }}
            >
              {panelBody}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export const ColorPickerWorkflow = () => {
  const { look, platform, theme } = usePlatform();

  return <ColorPickerWorkflowBody key={`${platform}-${look}`} theme={theme} />;
};

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
        <ClosedPicker theme={theme} />
        <Trigger disabled hsva={accent} label="Locked colour" open={false} />
      </StateGroup>
    </div>
  );
}

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
