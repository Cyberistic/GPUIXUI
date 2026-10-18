import { useCallback, useEffect, useState } from "react";
import type { Theme, ThemeMode } from "@gpuixui/tokens";
import {
  decodeState,
  defaultState,
  editableRoles,
  resolveTheme,
  themeSource,
  toCssVars,
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

  const edits = state[mode];

  const setColor = (role: EditableRole, value: string) =>
    commit({
      ...state,
      [mode]: { ...edits, colors: { ...edits.colors, [role]: value } },
    });

  const setRadius = (value: number) =>
    commit({ ...state, [mode]: { ...edits, radiusMd: value } });

  const setFont = (value: string) =>
    commit({ ...state, [mode]: { ...edits, fontSans: value } });

  const reset = () => {
    const defaults = defaultState();
    setState(defaults);
    localStorage.removeItem(STORAGE_KEY);
    const url = new URL(window.location.href);
    url.searchParams.delete(URL_PARAM);
    window.history.replaceState(null, "", url.toString());
  };

  const copy = () => {
    navigator.clipboard
      .writeText(themeSource(state))
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  };

  const resolved = resolveTheme(mode, edits);

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
                    value={edits.colors[role]}
                  />
                </label>
                <input
                  aria-label={`${role} value`}
                  className="gx-te-color-value"
                  onChange={(event) => setColor(role, event.target.value)}
                  spellCheck={false}
                  type="text"
                  value={edits.colors[role]}
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
                value={edits.radiusMd}
              />
              <span className="gx-te-range-value">{edits.radiusMd}px</span>
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
                value={edits.fontSans}
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

      <p className="gx-component-note">
        Browser preview of the semantic tokens from <code>@gpuixui/tokens</code>
        . The shipped components read these roles through GPUix, not CSS
        variables; the bridge above only exists for this preview.
      </p>
    </div>
  );
}
