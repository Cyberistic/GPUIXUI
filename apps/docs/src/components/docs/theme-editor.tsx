import { useCallback, useEffect, useMemo, useState } from "react";
import { themes, type Theme, type ThemeMode } from "@gpuixui/tokens";
import { platformThemes } from "../../lib/platform";
import { toCssVars } from "../../lib/theme-css";
import { usePlatformOptional } from "./platform-toggle";
import {
  auditFindings,
  auditReport,
  decodeState,
  defaultState,
  editableRoles,
  resolveTheme,
  themeSource,
  type EditableRole,
  type EditorState,
} from "./theme-editor-logic";

const STORAGE_KEY = "gpuixui-theme";
const URL_PARAM = "theme";

/** The browser rendering of one resolved theme, driven only by CSS variables. */
function ThemePreview({ theme }: { theme: Theme }) {
  const vars = toCssVars(theme);
  return (
    <div className="gx-te-preview" style={vars}>
      <div className="gx-te-card">
        <p className="gx-te-card-title">Account</p>
        <p className="gx-te-card-desc">
          Update your profile and how the app notifies you.
        </p>
        <div className="gx-te-field">
          <span className="gx-te-field-label">Email</span>
          <div className="gx-te-input">ada@example.com</div>
        </div>
        <div className="gx-te-actions">
          <button className="gx-te-btn gx-te-btn-primary" type="button">
            Save changes
          </button>
          <button className="gx-te-btn gx-te-btn-secondary" type="button">
            Cancel
          </button>
        </div>
      </div>
      <div className="gx-te-row">
        <span className="gx-te-badge">New</span>
        <span className="gx-te-badge gx-te-badge-muted">Draft</span>
        <button className="gx-te-btn gx-te-btn-destructive" type="button">
          Delete
        </button>
      </div>
      <p className="gx-te-muted">
        Popover, muted and border roles drive the chrome around the card.
      </p>
    </div>
  );
}

/** Live editor for the library's semantic tokens, with a shareable URL. */
export function ThemeEditor() {
  const platform = usePlatformOptional();
  const bases = useMemo(
    () =>
      platform === null
        ? themes
        : platformThemes(platform.platform, platform.look),
    [platform],
  );

  return <ThemeEditorSurface bases={bases} />;
}

/**
 * The editor itself, over an explicit base per mode. Keeping the base a prop is
 * what makes "the preview follows the platform switch" testable: the same
 * editor renders Windows's roles or the built-in identity depending on it, and
 * the reader's pins are applied over whichever one it is handed.
 */
export function ThemeEditorSurface({
  bases,
}: {
  readonly bases: Readonly<Record<ThemeMode, Theme>>;
}) {
  const [state, setState] = useState<EditorState>(defaultState);
  const [mode, setMode] = useState<ThemeMode>("light");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const raw =
      new URLSearchParams(window.location.search).get(URL_PARAM) ??
      localStorage.getItem(STORAGE_KEY);
    if (raw === null) return;
    const parsed = decodeState(raw);
    if (parsed !== undefined) setState(parsed);
  }, []);

  const commit = useCallback((next: EditorState) => {
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    const url = new URL(window.location.href);
    url.searchParams.set(URL_PARAM, JSON.stringify(next));
    window.history.replaceState(null, "", url.toString());
  }, []);

  const pins = state[mode];
  const base = bases[mode];

  const setColor = (role: EditableRole, value: string) =>
    commit({
      ...state,
      [mode]: { ...pins, colors: { ...pins.colors, [role]: value } },
    });

  const setRadius = (value: number) =>
    commit({ ...state, [mode]: { ...pins, radiusMd: value } });

  const setFont = (value: string) =>
    commit({ ...state, [mode]: { ...pins, fontSans: value } });

  const reset = () => {
    setState(defaultState());
    localStorage.removeItem(STORAGE_KEY);
    const url = new URL(window.location.href);
    url.searchParams.delete(URL_PARAM);
    window.history.replaceState(null, "", url.toString());
  };

  const copy = () => {
    const resolved = {
      light: resolveTheme("light", state.light, bases.light),
      dark: resolveTheme("dark", state.dark, bases.dark),
    };
    navigator.clipboard
      .writeText(themeSource(resolved))
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  };

  const resolved = resolveTheme(mode, pins, base);
  const findings = auditFindings(auditReport(mode, pins, base));

  return (
    <div className="gx-theme-editor not-prose">
      <div className="gx-te-bar">
        <div aria-label="Mode" className="gx-te-modes" role="group">
          {(["light", "dark"] as const).map((value) => (
            <button
              aria-pressed={mode === value}
              className="gx-te-mode"
              key={value}
              onClick={() => setMode(value)}
              type="button"
            >
              {value === "light" ? "Light" : "Dark"}
            </button>
          ))}
        </div>
        <div className="gx-te-bar-actions">
          <button className="gx-te-copy" onClick={copy} type="button">
            {copied ? "Copied" : "Copy theme"}
          </button>
          <button className="gx-te-reset" onClick={reset} type="button">
            Reset
          </button>
        </div>
      </div>

      <div className="gx-te-grid">
        <div className="gx-te-controls">
          <fieldset className="gx-te-group">
            <legend className="gx-te-legend">Colors</legend>
            {editableRoles.map((role) => (
              <div className="gx-te-color" key={role}>
                <label className="gx-te-color-swatch">
                  <span className="gx-te-role">{role}</span>
                  <input
                    aria-label={`${role} color`}
                    onChange={(event) => setColor(role, event.target.value)}
                    type="color"
                    value={pins.colors[role] ?? base.colors[role]}
                  />
                </label>
                <input
                  aria-label={`${role} value`}
                  className="gx-te-color-value"
                  onChange={(event) => setColor(role, event.target.value)}
                  spellCheck={false}
                  type="text"
                  value={pins.colors[role] ?? base.colors[role]}
                />
              </div>
            ))}
          </fieldset>

          <fieldset className="gx-te-group">
            <legend className="gx-te-legend">Radius</legend>
            <label className="gx-te-range">
              <span className="gx-te-role">radius</span>
              <input
                aria-label="radius"
                max={24}
                min={0}
                onChange={(event) => setRadius(Number(event.target.value))}
                type="range"
                value={pins.radiusMd ?? base.radius.md}
              />
              <span className="gx-te-range-value">
                {pins.radiusMd ?? base.radius.md}px
              </span>
            </label>
          </fieldset>

          <fieldset className="gx-te-group">
            <legend className="gx-te-legend">Font</legend>
            <label className="gx-te-font">
              <span className="gx-te-role">font family</span>
              <input
                aria-label="font family"
                list="gx-te-fonts"
                onChange={(event) => setFont(event.target.value)}
                spellCheck={false}
                type="text"
                value={pins.fontSans ?? base.typography.sans}
              />
              <datalist id="gx-te-fonts">
                <option value=".SystemUIFont" />
                <option value="Inter" />
                <option value="IBM Plex Sans" />
                <option value="Geist" />
                <option value="system-ui" />
              </datalist>
            </label>
          </fieldset>
        </div>

        <ThemePreview theme={resolved} />
      </div>

      <div
        aria-live="polite"
        className={`gx-te-audit ${findings.length === 0 ? "gx-te-audit-pass" : "gx-te-audit-fail"}`}
        role="status"
      >
        {findings.length === 0 ? (
          <p>
            Passes the library audit: every role paints, every shadow level
            paints its colour, every number lays out, every text pair clears its
            floor, every decorative surface stays visible, every data-series
            colour separates from its plot and from its neighbours under every
            colour-vision deficiency, every selection wash stays visible with
            readable text inside it, every indicator mark is findable on the
            strip it is drawn on, and every disabled control keeps its faded
            label.
          </p>
        ) : (
          <>
            <p>
              {findings.length} {findings.length === 1 ? "finding" : "findings"}{" "}
              from the library&apos;s <code>auditTheme</code>:
            </p>
            <ul>
              {findings.map((finding) => (
                <li
                  data-kind={finding.kind}
                  key={`${finding.kind}-${finding.text}`}
                >
                  {finding.text}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <p className="gx-component-note">
        Browser preview of the semantic tokens from <code>@gpuixui/tokens</code>
        . The shipped components read these roles through GPUix, not CSS
        variables; the bridge above only exists for this preview. The base is
        the platform style the switch selected — switch it and the preview
        re-bases while your edits stay; <strong>Reset</strong> clears them back
        to that style.
      </p>
    </div>
  );
}
