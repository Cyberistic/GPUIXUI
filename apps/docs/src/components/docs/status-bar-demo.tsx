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

export interface StatusBarItem {
  readonly id: string;
  readonly label: string;

  readonly tone?: StatusBarTone;
}

export const STATUS_BAR_TONES: ReadonlyArray<StatusBarTone> = [
  "default",
  ...statusTones,
];

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

export const toneRole = (tone: StatusBarTone): string =>
  Option.match(statusToneOf(tone), {
    onNone: () => "the bar's own foreground",
    onSome: (named) => `the ${named} tone's readable role`,
  });

export interface StatusBarFrameProps {
  readonly theme: Theme;
  readonly label: string;
  readonly left: ReadonlyArray<StatusBarItem>;
  readonly center?: ReadonlyArray<StatusBarItem>;
  readonly right: ReadonlyArray<StatusBarItem>;
}

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

export function StatusBarDemo() {
  const { theme } = usePlatform();
  const [tone, setTone] = useState<StatusBarTone>("destructive");

  const right: ReadonlyArray<StatusBarItem> = Arr.map(
    STATUS_BAR_RIGHT,
    (item) => (item.id === "errors" ? { ...item, tone } : item),
  );

  return (
    <div className="gx-shell-demo gx-status-demo">
      {}
      <div aria-label="Item tone" className="gx-tgroup" role="group">
        {STATUS_BAR_TONES.map((candidate) => (
          <button
            aria-label={candidate}
            aria-pressed={candidate === tone}
            className="gx-btn gx-btn-ghost gx-btn-sm gx-toggle"
            data-pressed={candidate === tone ? "" : undefined}
            key={candidate}
            onClick={() => setTone(candidate)}
            type="button"
          >
            {candidate}
          </button>
        ))}
      </div>
      <StatusBarFrame
        center={STATUS_BAR_CENTER}
        label="Editor status"
        left={STATUS_BAR_LEFT}
        right={right}
        theme={theme}
      />
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
