import { useEffect, useState } from "react";
import type { DensityName, ThemeMode } from "@gpuixui/tokens";
import {
  defaultEdits,
  editableRoles,
  fromQuery,
  isDefault,
  roleLabel,
  themeFor,
  themeSource,
  toQuery,
  type EditableRole,
  type ThemeEdits,
} from "@/lib/theme-editor";
import { ButtonPreview } from "./preview/approximations";
import { TextInputPreview } from "./preview/control-previews";

/**
 * The theme editor (plan 595).
 *
 * It edits the small role set in `theme-editor.ts`, resolves the result through
 * the library's own `extendTheme`, and paints the same `PreviewSurface` the
 * component pages use. The values a reader sees, copies and shares are one
 * `Theme`; the browser preview stays a labelled approximation of the native
 * window, exactly like every other tier-A preview.
 */

const modes = ["light", "dark"] as const satisfies readonly ThemeMode[];

const densities = [
  "compact",
  "comfortable",
  "spacious",
] as const satisfies readonly DensityName[];

const densityLabel = (density: DensityName): string =>
  density.charAt(0).toUpperCase() + density.slice(1);

type CopyState = "idle" | "copied" | "failed";

const statusText = (state: CopyState): string => {
  if (state === "copied") return "Copied to the clipboard.";
  if (state === "failed") {
    return "Copy failed — select the module below instead.";
  }
  return "The module imports from @gpuixui/tokens and needs no docs-specific code.";
};

export function ThemeEditor() {
  const [edits, setEdits] = useState<ThemeEdits>(() => defaultEdits("light"));
  const [loaded, setLoaded] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>("idle");

  useEffect(() => {
    const parsed = fromQuery(
      new URLSearchParams(window.location.search).get("theme"),
    );
    if (parsed !== undefined) setEdits(parsed);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const url = new URL(window.location.href);
    if (isDefault(edits)) {
      url.searchParams.delete("theme");
    } else {
      url.searchParams.set("theme", toQuery(edits));
    }
    window.history.replaceState(window.history.state, "", url);
  }, [edits, loaded]);

  const theme = themeFor(edits);
  const source = themeSource(edits);

  const update = (next: ThemeEdits) => {
    setEdits(next);
    setCopyState("idle");
  };

  const setColor = (role: EditableRole, value: string) =>
    update({ ...edits, colors: { ...edits.colors, [role]: value } });

  const copy = () => {
    if (navigator.clipboard === undefined) {
      setCopyState("failed");
      return;
    }
    void navigator.clipboard.writeText(source).then(
      () => setCopyState("copied"),
      () => setCopyState("failed"),
    );
  };

  return (
    <div
      data-theme-editor=""
      data-theme-editor-ready={loaded ? "" : undefined}
      className="not-prose my-6 flex flex-col gap-6"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-5">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">Start from</legend>
            <div className="flex flex-wrap gap-4">
              {modes.map((mode) => (
                <label
                  key={mode}
                  className="flex items-center gap-2 text-sm capitalize"
                >
                  <input
                    type="radio"
                    name="theme-base"
                    value={mode}
                    checked={edits.base === mode}
                    onChange={() => update(defaultEdits(mode))}
                  />
                  {mode}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">Density</legend>
            <div className="flex flex-wrap gap-4">
              {densities.map((density) => (
                <label
                  key={density}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="radio"
                    name="theme-density"
                    value={density}
                    checked={edits.density === density}
                    onChange={() => update({ ...edits, density })}
                  />
                  {densityLabel(density)}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            {editableRoles.map((role) => (
              <label
                key={role}
                htmlFor={`theme-color-${role}`}
                className="flex min-w-0 items-center gap-2 text-sm"
              >
                <input
                  id={`theme-color-${role}`}
                  data-theme-color={role}
                  aria-label={roleLabel(role)}
                  type="color"
                  value={edits.colors[role]}
                  onChange={(event) => setColor(role, event.target.value)}
                  className="h-7 w-9 shrink-0 rounded border border-fd-border bg-transparent"
                />
                <span className="min-w-0 flex-1">{roleLabel(role)}</span>
                <code className="shrink-0 font-mono text-xs text-fd-muted-foreground">
                  {edits.colors[role]}
                </code>
              </label>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              data-theme-editor-reset
              onClick={() => update(defaultEdits("light"))}
              className="h-9 rounded-md border border-fd-border px-3 text-sm font-medium hover:bg-fd-accent"
            >
              Reset to defaults
            </button>
            <button
              type="button"
              data-theme-editor-copy
              onClick={copy}
              className="h-9 rounded-md bg-fd-primary px-3 text-sm font-medium text-fd-primary-foreground"
            >
              Copy theme
            </button>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div data-theme-preview="" className="flex flex-col gap-4">
            <ButtonPreview theme={theme} locked />
            <TextInputPreview theme={theme} locked />
          </div>

          <p
            role="status"
            aria-live="polite"
            className="text-sm text-fd-muted-foreground"
          >
            {statusText(copyState)}
          </p>

          <div>
            <p className="mb-2 text-sm font-medium">Copied module</p>
            <pre
              data-theme-source=""
              tabIndex={0}
              aria-label="Generated theme module"
              className="max-h-80 overflow-auto rounded-lg border border-fd-border bg-fd-muted p-4 font-mono text-xs"
            >
              <code>{source}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
