/**
 * Browser drawings for the three Mac controls (plan 725): the segmented
 * control, the disclosure and the inset group.
 *
 * Each mirrors the shipped geometry and reads the preview surface's theme
 * roles; the segmented control and the disclosure answer the reader the way
 * the native ones do — the arrows select, the header folds.
 */

import { useState, type KeyboardEvent } from "react";

const VIEWS = ["List", "Board", "Calendar"] as const;

export function SegmentedControlDemo() {
  const [view, setView] = useState<string>("List");
  const step = (event: KeyboardEvent, from: string) => {
    const at = VIEWS.indexOf(from as (typeof VIEWS)[number]);
    const next =
      event.key === "ArrowRight"
        ? VIEWS[at + 1]
        : event.key === "ArrowLeft"
          ? VIEWS[at - 1]
          : undefined;
    if (next === undefined) return;
    setView(next);
    const target =
      event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(
        `[data-value="${next}"]`,
      );
    target?.focus({ preventScroll: true });
  };
  return (
    <div className="gx-demo gx-mac-scene">
      <div className="gx-segmented" role="radiogroup" aria-label="View">
        {VIEWS.map((item) => (
          <button
            aria-checked={item === view}
            data-value={item}
            key={item}
            onClick={() => setView(item)}
            onKeyDown={(event) => step(event, item)}
            role="radio"
            tabIndex={item === view ? 0 : -1}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>
      <p className="gx-platform-caption">
        Showing the {view.toLowerCase()} view.
      </p>
    </div>
  );
}

export function DisclosureDemo() {
  const [open, setOpen] = useState({ details: true, activity: false });
  const section = (key: keyof typeof open, title: string, body: string) => (
    <div className="gx-disclosure">
      <button
        aria-expanded={open[key]}
        onClick={() => setOpen({ ...open, [key]: !open[key] })}
        type="button"
      >
        <span aria-hidden="true">{open[key] ? "▾" : "▸"}</span>
        {title}
      </button>
      {open[key] ? <p>{body}</p> : null}
    </div>
  );
  return (
    <div className="gx-demo gx-mac-scene">
      <div className="gx-mac-inspector">
        {section(
          "details",
          "Details",
          "Owner · Killua Zoldyck · due 14 November",
        )}
        {section("activity", "Activity", "Gon moved this to Review")}
      </div>
    </div>
  );
}

export function InsetGroupDemo() {
  const rows = [
    {
      label: "Show previews",
      hint: "Message text on the lock screen",
      on: true,
    },
    { label: "Badge app icon", hint: undefined, on: false },
    { label: "Sounds", hint: undefined, on: true },
  ];
  return (
    <div className="gx-demo gx-mac-scene">
      <div className="gx-inset">
        <span className="gx-inset-title">Notifications</span>
        <div className="gx-inset-box">
          {rows.map((row) => (
            <div className="gx-inset-row" key={row.label}>
              <span>
                {row.label}
                {row.hint === undefined ? null : <small>{row.hint}</small>}
              </span>
              <span
                className="gx-inset-switch"
                data-on={row.on ? "" : undefined}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const segmentedControlDemoSource = `import { SegmentedControl } from "@gpuixui/components/segmented-control";

const [view, setView] = useState("list");

<SegmentedControl
  label="View"
  value={view}
  onValueChange={setView}
  items={[
    { value: "list", label: "List", icon: "list" },
    { value: "board", label: "Board", icon: "grid" },
    { value: "calendar", label: "Calendar", icon: "calendar" },
  ]}
/>;`;

export const disclosureDemoSource = `import { Disclosure } from "@gpuixui/components/disclosure";

<Disclosure title="Details">
  <text>Owner · Killua Zoldyck</text>
</Disclosure>
<Disclosure title="Activity" defaultOpen={false}>
  <text>Gon moved this to Review</text>
</Disclosure>`;

export const insetGroupDemoSource = `import { InsetGroup, InsetGroupRow } from "@gpuixui/components/inset-group";
import { Switch } from "@gpuixui/primitives";

<InsetGroup title="Notifications">
  <InsetGroupRow
    label="Show previews"
    description="Message text on the lock screen"
    control={<Switch label="Show previews" defaultChecked />}
  />
  <InsetGroupRow label="Badge app icon" control={<Switch label="Badge app icon" />} />
  <InsetGroupRow label="Sounds" control={<Switch label="Sounds" defaultChecked />} />
</InsetGroup>`;
