import { statusTones, type Theme } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useState } from "react";
import {
  statusToneOf,
  toneForeground,
  type StatusBarTone,
} from "@/lib/shell-logic";
import { usePlatform } from "./platform-toggle";

/**
 * Browser preview for the Status bar page.
 *
 * `@gpuixui/shell`'s `StatusBar` is a GPUix host row, so the page cannot mount
 * it and this drawing is a labelled approximation. The tone rule is the
 * package's: `statusToneOf` names the status tone a bar tone stands for and
 * `toneForeground` paints the readable role that tone wears, so an item never
 * mixes a readable colour by hand. Only the paint is the browser's.
 */

/** One item in a status bar group. */
export interface StatusBarItem {
  readonly id: string;
  readonly label: string;
  /** The item's colour tone; `default` keeps the bar's foreground. */
  readonly tone?: StatusBarTone;
}

/** The tones a reader can give an item, the bar's own first. */
export const STATUS_BAR_TONES: ReadonlyArray<StatusBarTone> = [
  "default",
  ...statusTones,
];

/** The items the drawing opens with, left and right. */
export const STATUS_BAR_LEFT: ReadonlyArray<StatusBarItem> = [
  { id: "branch", label: "main" },
  { id: "position", label: "Ln 12, Col 4" },
];

export const STATUS_BAR_CENTER: ReadonlyArray<StatusBarItem> = [
  { id: "file", label: "packages/shell/src/toolbar/toolbar.tsx" },
];

export const STATUS_BAR_RIGHT: ReadonlyArray<StatusBarItem> = [
  { id: "encoding", label: "UTF-8" },
  { id: "errors", label: "3 errors", tone: "destructive" },
];

/** The role a tone's text paints in, for the readout. */
export const toneRole = (tone: StatusBarTone): string =>
  Option.match(statusToneOf(tone), {
    onNone: () => "the bar's own foreground",
    onSome: (named) => `the ${named} tone's readable role`,
  });

/** The drawing itself: the two groups, their separators and their items. */
export interface StatusBarFrameProps {
  readonly theme: Theme;
  readonly label: string;
  readonly left: ReadonlyArray<StatusBarItem>;
  readonly center?: ReadonlyArray<StatusBarItem>;
  readonly right: ReadonlyArray<StatusBarItem>;
}

/** The bar, its groups and its items. */
export function StatusBarFrame({
  theme,
  label,
  left,
  center = [],
  right,
}: StatusBarFrameProps) {
  const group = (items: ReadonlyArray<StatusBarItem>) =>
    Arr.map(items, (item, index) => (
      <span className="gx-shell-status-slot" key={item.id}>
        {index === 0 ? null : (
          <span aria-hidden="true" className="gx-shell-separator" />
        )}
        <span
          className="gx-shell-status-item"
          data-item={item.id}
          data-tone={item.tone ?? "default"}
          style={{
            color: toneForeground(theme, item.tone ?? "default"),
          }}
        >
          {item.label}
        </span>
      </span>
    ));

  return (
    <div aria-label={label} className="gx-shell-status" role="status">
      {group(left)}
      <span className="gx-shell-status-gap">{group(center)}</span>
      {group(right)}
    </div>
  );
}

/** The page's preview: the bar and the tone its right-hand item wears. */
export function StatusBarDemo() {
  const { theme } = usePlatform();
  const [tone, setTone] = useState<StatusBarTone>("destructive");

  const right: ReadonlyArray<StatusBarItem> = Arr.map(
    STATUS_BAR_RIGHT,
    (item) => (item.id === "errors" ? { ...item, tone } : item),
  );

  return (
    <div className="gx-shell-demo">
      <StatusBarFrame
        center={STATUS_BAR_CENTER}
        label="Editor status"
        left={STATUS_BAR_LEFT}
        right={right}
        theme={theme}
      />
      <div className="gx-shell-actions">
        <div aria-label="Item tone" className="gx-shell-group" role="group">
          {STATUS_BAR_TONES.map((candidate) => (
            <button
              aria-pressed={candidate === tone}
              className="gx-shell-choice"
              key={candidate}
              onClick={() => setTone(candidate)}
              type="button"
            >
              {candidate}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export const statusBarDemoSource = `import { StatusBar, type StatusBarItem } from "@gpuixui/shell";

const left: ReadonlyArray<StatusBarItem> = [
  { id: "branch", label: "main" },
  { id: "position", label: "Ln 12, Col 4" },
];

const center: ReadonlyArray<StatusBarItem> = [
  { id: "file", label: "packages/shell/src/toolbar/toolbar.tsx" },
];

const right: ReadonlyArray<StatusBarItem> = [
  { id: "encoding", label: "UTF-8" },
  { id: "errors", label: "3 errors", tone: "destructive" },
];

export function EditorStatus() {
  return (
    <StatusBar
      label="Editor status"
      left={left}
      center={center}
      right={right}
    />
  );
}`;
