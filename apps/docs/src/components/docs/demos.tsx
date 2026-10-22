import {
  Fragment,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import {
  commandMatches,
  firstEnabled,
  nextEnabled,
  type CommandAction,
} from "./command-preview";
import {
  enabledEntries,
  highlightAfter,
  menuEntries,
  type MenuEntry,
} from "./menu-preview";

/**
 * Browser previews for the docs pages.
 *
 * GPUIxUI renders through GPUix, never the DOM. A docs page therefore cannot
 * mount the shipped component; each demo below reproduces the component's
 * measured geometry, states and keyboard rules with HTML, and every page says
 * so. The Code tab always shows the real native usage.
 */

export interface Demo {
  readonly render: () => ReactNode;
  readonly source: string;
  /** A composition of parts rather than one component; the note says so. */
  readonly composition?: boolean;
}

const ButtonRow = () => (
  <>
    <button className="gx-btn gx-btn-primary" type="button">
      Save changes
    </button>
    <button className="gx-btn gx-btn-secondary" type="button">
      Duplicate
    </button>
    <button className="gx-btn gx-btn-outline" type="button">
      Share
    </button>
    <button className="gx-btn gx-btn-ghost" type="button">
      Cancel
    </button>
    <button className="gx-btn gx-btn-destructive" type="button">
      Delete
    </button>
    <button className="gx-btn gx-btn-link" type="button">
      View log
    </button>
  </>
);

const ButtonSizes = () => (
  <div className="gx-demo-column">
    <p className="gx-demo-label">Sizes</p>
    <div className="gx-demo-row">
      <button className="gx-btn gx-btn-primary gx-btn-sm" type="button">
        Small
      </button>
      <button className="gx-btn gx-btn-primary" type="button">
        Medium
      </button>
      <button className="gx-btn gx-btn-primary gx-btn-lg" type="button">
        Large
      </button>
    </div>
  </div>
);

const ButtonStates = () => (
  <div className="gx-demo-row">
    <button className="gx-btn gx-btn-primary" type="button">
      <span aria-hidden="true" className="gx-spinner" />
      Saving…
    </button>
    <button className="gx-btn gx-btn-secondary" disabled type="button">
      Disabled
    </button>
    <button
      aria-label="Add column"
      className="gx-btn gx-btn-outline gx-btn-square"
      type="button"
    >
      +
    </button>
    <button className="gx-btn gx-btn-outline" type="button">
      <span aria-hidden="true">⌘</span>K
    </button>
  </div>
);

const PLAN_ROWS: ReadonlyArray<readonly [string, string]> = [
  ["Seats", "12 of 20"],
  ["Storage", "184 GB"],
  ["Invoices", "Enabled"],
];

/**
 * One card, drawn with the recipe's fixed metrics.
 *
 * The colours are the preview surface's roles; the geometry is the recipe's,
 * because the components compile `CARD_*` against the default registry
 * (shadcn's fixed metrics) rather than the primitives' density scale.
 */
const PlanCard = ({
  variant,
}: {
  readonly variant: "outline" | "elevated" | "plain";
}) => (
  <div className={`gx-card gx-card-${variant}`}>
    <div className="gx-card-header">
      <p className="gx-card-title">Pro plan</p>
      <p className="gx-card-desc">
        Everything in Starter, plus seats and invoicing.
      </p>
    </div>
    <div className="gx-card-content">
      {PLAN_ROWS.map(([label, value]) => (
        <div className="gx-card-row" key={label}>
          <span>{label}</span>
          <span className="gx-card-value">{value}</span>
        </div>
      ))}
    </div>
    <div className="gx-card-footer">
      <span>Manage billing</span>
      <span>Cancel plan</span>
    </div>
  </div>
);

const CardVariants = () => (
  <div className="gx-card-grid">
    {(["outline", "elevated", "plain"] as const).map((variant) => (
      <div className="gx-card-column" key={variant}>
        <p className="gx-demo-label">{variant}</p>
        <PlanCard variant={variant} />
      </div>
    ))}
  </div>
);

const CardComposition = () => (
  <div className="gx-card gx-card-outline gx-card-wide">
    <div className="gx-card-header">
      <p className="gx-card-title">Notifications</p>
      <p className="gx-card-desc">
        Choose what this workspace emails you about.
      </p>
    </div>
    <div className="gx-card-content">
      <div className="gx-card-row">
        <span>Build failures</span>
        <span className="gx-card-value">Immediately</span>
      </div>
      <div className="gx-card-row">
        <span>Weekly digest</span>
        <span className="gx-card-value">Mondays</span>
      </div>
    </div>
    <div className="gx-card-footer gx-card-footer-padded">
      <button className="gx-btn gx-btn-secondary" type="button">
        Cancel
      </button>
      <button className="gx-btn gx-btn-primary" type="button">
        Save changes
      </button>
    </div>
  </div>
);

const DialogDemo = () => {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="gx-demo-dialog">
      <button
        className="gx-btn gx-btn-primary"
        onClick={() => setOpen(true)}
        type="button"
      >
        Rename project
      </button>
      {open ? (
        <div
          className="gx-dialog-backdrop"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            aria-labelledby="gx-dialog-demo-title"
            aria-modal="true"
            className="gx-dialog"
            onClick={(event) => event.stopPropagation()}
            ref={panel}
            role="dialog"
            tabIndex={-1}
          >
            <button
              aria-label="Close"
              className="gx-dialog-close"
              onClick={() => setOpen(false)}
              type="button"
            >
              ✕
            </button>
            <h2 className="gx-dialog-title" id="gx-dialog-demo-title">
              Rename project
            </h2>
            <p className="gx-dialog-desc">
              Used in the window title and in every path that references the
              project.
            </p>
            <label className="gx-demo-label" htmlFor="gx-dialog-demo-name">
              Project name
            </label>
            <input
              className="gx-field"
              defaultValue="Hunter License"
              id="gx-dialog-demo-name"
            />
            <div className="gx-dialog-actions">
              <button
                className="gx-btn gx-btn-ghost"
                onClick={() => setOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="gx-btn gx-btn-primary"
                onClick={() => setOpen(false)}
                type="button"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const PopoverDemo = () => {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPress = (event: MouseEvent) => {
      if (!anchor.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPress);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPress);
    };
  }, [open]);

  return (
    <div className="gx-demo-popover">
      <div className="gx-popover-anchor" ref={anchor}>
        <button
          aria-expanded={open}
          className="gx-btn gx-btn-secondary"
          onClick={() => setOpen(!open)}
          type="button"
        >
          Columns
        </button>
        {open ? (
          <div className="gx-popover" role="dialog">
            <p className="gx-popover-title">Visible columns</p>
            <p className="gx-popover-body">
              Choose which fields a run summary shows. The setting is per
              project.
            </p>
            <div className="gx-popover-meta">
              <span>3 of 7 shown</span>
              <b>Saved</b>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

/**
 * The layout lane's frame: a fixed sidebar, a header row, and a scrolling body
 * that takes the remaining height. It is a composition of `Box`, `Stack` and
 * `ScrollArea`, so the preview says so rather than presenting it as a component.
 */
const LayoutShell = () => (
  <div className="gx-shell">
    <div className="gx-shell-sidebar">
      <span className="gx-shell-brand">
        <span aria-hidden="true" className="gx-shell-mark" />
        Atlas
      </span>
      {["Overview", "Runs", "Datasets", "Settings"].map((item) => (
        <span
          aria-current={item === "Overview" ? "page" : undefined}
          className="gx-shell-nav"
          key={item}
        >
          {item}
        </span>
      ))}
    </div>
    <div className="gx-shell-main">
      <div className="gx-shell-header">
        <span>Overview</span>
        <span className="gx-shell-meta">3 open runs</span>
      </div>
      <div className="gx-shell-body">
        <div className="gx-shell-cards">
          <div className="gx-shell-card">
            <p className="gx-shell-card-title">Build #481</p>
            <p className="gx-shell-card-desc">Passed in 2m 14s</p>
          </div>
          <div className="gx-shell-card">
            <p className="gx-shell-card-title">Nightly export</p>
            <p className="gx-shell-card-desc">62% of 4.2 GB</p>
          </div>
        </div>
        <div className="gx-shell-card">
          <p className="gx-shell-card-title">Ingest queue</p>
          <p className="gx-shell-card-desc">
            The body scrolls; the header stays.
          </p>
          <div className="gx-shell-bar">
            <div className="gx-shell-fill" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const tabRows = [
  {
    value: "profile",
    label: "Profile",
    body: (
      <>
        <b>Profile</b> — the name, avatar and timezone of the current account.
        Changes apply to every project.
      </>
    ),
  },
  {
    value: "notifications",
    label: "Notifications",
    body: (
      <>
        <b>Notifications</b> — desktop alerts for runs that finish, fail or need
        attention. Keep them short.
      </>
    ),
  },
  {
    value: "billing",
    label: "Billing",
    body: (
      <>
        <b>Billing</b> — the plan, seats and invoices for the workspace. Billing
        is per workspace, not per member.
      </>
    ),
  },
] as const;

const TabsDemo = () => {
  const [selected, setSelected] = useState("profile");
  const id = useId();
  const triggers = useRef<Array<HTMLButtonElement | null>>([]);
  const [indicator, setIndicator] = useState<{ x: number; w: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    const index = tabRows.findIndex((tab) => tab.value === selected);
    const element = triggers.current[index];
    if (element === null || element === undefined) return;
    const update = () =>
      setIndicator({ x: element.offsetLeft, w: element.offsetWidth });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [selected]);

  const move = (event: ReactKeyboardEvent, index: number) => {
    const last = tabRows.length - 1;
    let target: number | undefined;
    if (event.key === "ArrowRight") target = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft") target = index === 0 ? last : index - 1;
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = last;
    if (target === undefined) return;
    const next = tabRows[target];
    if (next === undefined) return;
    event.preventDefault();
    setSelected(next.value);
    triggers.current[target]?.focus();
  };

  return (
    <div className="gx-demo-tabs">
      <div
        aria-label="Account settings"
        className="gx-tabs-list"
        role="tablist"
      >
        {indicator === null ? null : (
          <span
            aria-hidden="true"
            className="gx-tabs-indicator"
            style={{
              transform: `translateX(${indicator.x}px)`,
              width: indicator.w,
            }}
          />
        )}
        {tabRows.map((tab, index) => (
          <button
            aria-controls={`${id}-${tab.value}-panel`}
            aria-selected={selected === tab.value}
            className="gx-tab"
            id={`${id}-${tab.value}-tab`}
            key={tab.value}
            onClick={() => setSelected(tab.value)}
            onKeyDown={(event) => move(event, index)}
            ref={(element) => {
              triggers.current[index] = element;
            }}
            role="tab"
            tabIndex={selected === tab.value ? 0 : -1}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabRows.map((tab) =>
        selected === tab.value ? (
          <div
            aria-labelledby={`${id}-${tab.value}-tab`}
            className="gx-tab-panel"
            id={`${id}-${tab.value}-panel`}
            key={tab.value}
            role="tabpanel"
          >
            {tab.body}
          </div>
        ) : null,
      )}
    </div>
  );
};

const DropdownMenuDemo = () => {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState<MenuEntry["id"] | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [lastAction, setLastAction] = useState("nothing yet");
  const anchor = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const rows = useRef(new Map<MenuEntry["id"], HTMLButtonElement>());
  /** What to focus once the open render commits: a row, or the surface. */
  const initialFocus = useRef<MenuEntry["id"] | "surface" | null>(null);

  /** Opening by pointer leaves the surface focused with no row highlighted,
   * which is the desktop convention the native component follows. Opening by
   * keyboard lands on a row, so the next Enter runs it. */
  const openWith = (target: MenuEntry["id"] | "surface") => {
    initialFocus.current = target;
    setOpen(true);
  };

  const focusRow = (id: MenuEntry["id"]) => {
    rows.current.get(id)?.focus();
  };

  const activate = (entry: MenuEntry) => {
    if (entry.id === "hidden") {
      setShowHidden(!showHidden);
      return; // a checkbox row does not close the menu
    }
    setLastAction(entry.label);
    setOpen(false);
    setHighlight(null);
    trigger.current?.focus();
  };

  const move = (delta: 1 | -1) => {
    const next = highlightAfter(highlight, delta);
    if (next !== null) focusRow(next);
  };

  const dismiss = () => {
    setOpen(false);
    setHighlight(null);
    trigger.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const target = initialFocus.current;
    initialFocus.current = null;
    if (target === "surface") surface.current?.focus();
    else if (target !== null) focusRow(target);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      setHighlight(null);
      trigger.current?.focus();
    };
    const onPress = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (anchor.current?.contains(target) === true) return;
      setOpen(false);
      setHighlight(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPress);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPress);
    };
  }, [open]);

  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const { key } = event;
    if (key === "ArrowDown" || key === "ArrowUp") {
      event.preventDefault();
      move(key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (key === "Home" || key === "End") {
      event.preventDefault();
      const target = key === "Home" ? enabledEntries[0] : enabledEntries.at(-1);
      if (target !== undefined) focusRow(target.id);
      return;
    }
    if (key === "Enter" || key === " ") {
      const entry = menuEntries.find((candidate) => candidate.id === highlight);
      if (entry === undefined) return;
      event.preventDefault();
      activate(entry);
      return;
    }
    if (key === "Escape") {
      event.preventDefault();
      dismiss();
      return;
    }
    if (key === "Tab") {
      // A menu is not modal: Tab closes it and lets the focus move on.
      setOpen(false);
      setHighlight(null);
    }
  };

  const row = (entry: MenuEntry) => (
    <button
      aria-selected={entry.id === "hidden" ? showHidden : undefined}
      className="gx-menu-row"
      data-highlighted={highlight === entry.id}
      data-tone={entry.tone}
      disabled={entry.disabled}
      key={entry.id}
      onClick={() => activate(entry)}
      onFocus={() => setHighlight(entry.id)}
      ref={(element) => {
        if (element === null) rows.current.delete(entry.id);
        else rows.current.set(entry.id, element);
      }}
      role={entry.id === "hidden" ? "menuitemcheckbox" : "menuitem"}
      tabIndex={-1}
      type="button"
    >
      <span>{entry.label}</span>
      {entry.id === "hidden" ? (
        <span aria-hidden="true" className="gx-menu-check">
          {showHidden ? "✓" : ""}
        </span>
      ) : null}
    </button>
  );

  const destructive = menuEntries.find((entry) => entry.tone === "destructive");

  return (
    <div className="gx-demo-menu">
      <div className="gx-menu-file">
        <div>
          <p className="gx-menu-file-title">ata-schema.json</p>
          <p className="gx-menu-file-meta">Edited 2 min ago</p>
        </div>
        <div className="gx-menu-anchor" ref={anchor}>
          <button
            aria-expanded={open}
            className="gx-btn gx-btn-secondary gx-btn-sm"
            onClick={() => {
              if (open) {
                setOpen(false);
                setHighlight(null);
                return;
              }
              openWith("surface");
            }}
            onKeyDown={(event) => {
              if (
                event.key === "ArrowDown" ||
                event.key === "Enter" ||
                event.key === " "
              ) {
                event.preventDefault();
                if (open) dismiss();
                else openWith(enabledEntries[0]?.id ?? "surface");
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                openWith(enabledEntries.at(-1)?.id ?? "surface");
                return;
              }
              if (event.key === "Escape" && open) {
                event.preventDefault();
                dismiss();
              }
            }}
            ref={trigger}
            type="button"
          >
            Actions
          </button>
          {open ? (
            <div
              aria-label="File actions"
              className="gx-menu"
              onKeyDown={onMenuKeyDown}
              ref={surface}
              role="menu"
              tabIndex={-1}
            >
              <p aria-hidden="true" className="gx-menu-label">
                File actions
              </p>
              {menuEntries.filter((entry) => entry !== destructive).map(row)}
              <div className="gx-menu-separator" role="separator" />
              {destructive === undefined ? null : row(destructive)}
            </div>
          ) : null}
        </div>
      </div>
      <p className="gx-menu-readout">
        Last action: <b>{lastAction}</b> · Hidden files:{" "}
        <b>{showHidden ? "shown" : "hidden"}</b>
      </p>
    </div>
  );
};

const CommandMenuDemo = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const rows = commandMatches(query);

  const close = () => {
    setOpen(false);
    setHighlight(null);
    trigger.current?.focus();
  };

  const openPalette = () => {
    setQuery("");
    setHighlight(firstEnabled(commandMatches("")) ?? null);
    setOpen(true);
  };

  const run = (action: CommandAction) => {
    if (action.disabled === true) return;
    setLastAction(action.label);
    close();
  };

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const onInput = (value: string) => {
    setQuery(value);
    // Typing resets the highlight to the first runnable match, as the
    // component does — the query changes which row Enter would run.
    setHighlight(firstEnabled(commandMatches(value)) ?? null);
  };

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = nextEnabled(
        rows,
        highlight,
        event.key === "ArrowDown" ? 1 : -1,
      );
      if (next !== undefined) setHighlight(next);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const ordered = event.key === "Home" ? rows : [...rows].reverse();
      const next = firstEnabled(ordered);
      if (next !== undefined) setHighlight(next);
      return;
    }
    if (event.key !== "Enter") return;
    const action = rows.find((row) => row.id === highlight);
    if (action === undefined) return;
    event.preventDefault();
    run(action);
  };

  return (
    <div className="gx-demo-command">
      <div className="gx-command-file">
        <div>
          <p className="gx-menu-file-title">workspace.ts</p>
          <p className="gx-menu-file-meta">2 unsaved changes</p>
        </div>
        <button
          className="gx-btn gx-btn-secondary gx-btn-sm"
          onClick={openPalette}
          ref={trigger}
          type="button"
        >
          Commands <kbd className="gx-command-key">⌘K</kbd>
        </button>
      </div>
      <p className="gx-menu-readout">
        Last action: <b>{lastAction ?? "none yet"}</b>
      </p>
      {open ? (
        <div className="gx-dialog-backdrop" role="presentation">
          <div
            aria-label="Command menu"
            aria-modal="true"
            className="gx-palette"
            role="dialog"
          >
            <input
              aria-label="Search commands"
              className="gx-palette-input"
              onChange={(event) => onInput(event.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Type a command…"
              ref={input}
              value={query}
            />
            <div className="gx-palette-list" role="listbox">
              {rows.length === 0 ? (
                <p className="gx-palette-empty">No matching commands</p>
              ) : null}
              {rows.map((action, index) => (
                <Fragment key={action.id}>
                  {index === 0 || rows[index - 1]?.group !== action.group ? (
                    <p aria-hidden="true" className="gx-menu-label">
                      {action.group}
                    </p>
                  ) : null}
                  <button
                    aria-selected={highlight === action.id}
                    className="gx-menu-row"
                    data-highlighted={highlight === action.id}
                    disabled={action.disabled}
                    onClick={() => run(action)}
                    role="option"
                    type="button"
                  >
                    <span>{action.label}</span>
                    {action.shortcut === undefined ? null : (
                      <kbd className="gx-command-key">{action.shortcut}</kbd>
                    )}
                  </button>
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const buttonSource = `import { Button } from "@gpuixui/primitives";

export function ProjectActions() {
  return (
    <div style={{ display: "flex", flexDirection: "row", gap: 10 }}>
      <Button variant="primary" onActivate={save}>
        Save changes
      </Button>
      <Button variant="secondary">Duplicate</Button>
      <Button variant="outline">Share</Button>
      <Button variant="ghost">Cancel</Button>
      <Button variant="destructive">Delete</Button>
      <Button variant="link">View log</Button>
    </div>
  );
}`;

const sizeSource = `import { Button, Stack } from "@gpuixui/primitives";

<Stack direction="row" gap="sm">
  <Button size="sm">Small</Button>
  <Button size="md">Medium</Button>
  <Button size="lg">Large</Button>
</Stack>;`;

const stateSource = `import { Button } from "@gpuixui/primitives";

<Button variant="primary" loading={saving}>
  Saving…
</Button>

<Button variant="secondary" disabled>
  Disabled
</Button>

<Button square label="Add column">
  +
</Button>;`;

const cardVariantsSource = `import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@gpuixui/components/card";

const rows = [
  ["Seats", "12 of 20"],
  ["Storage", "184 GB"],
  ["Invoices", "Enabled"],
];

export const PlanCards = () => (
  <div style={{ display: "flex", flexDirection: "row", gap: 16 }}>
    {(["outline", "elevated", "plain"] as const).map((variant) => (
      <Card key={variant} variant={variant} style={{ width: 260 }}>
        <CardHeader>
          <CardTitle>Pro plan</CardTitle>
          <CardDescription>
            Everything in Starter, plus seats and invoicing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.map(([label, value]) => (
            <div
              key={label}
              style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}
            >
              <text>{label}</text>
              <text>{value}</text>
            </div>
          ))}
        </CardContent>
        <CardFooter>
          <text>Manage billing</text>
          <text>Cancel plan</text>
        </CardFooter>
      </Card>
    ))}
  </div>
);`;

const cardCompositionSource = `import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@gpuixui/components/card";
import { Button } from "@gpuixui/primitives";

export const NotificationCard = ({ save }: { save: () => void }) => (
  <Card style={{ maxWidth: 420 }}>
    <CardHeader>
      <CardTitle>Notifications</CardTitle>
      <CardDescription>
        Choose what this workspace emails you about.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <text>Build failures — immediately</text>
      <text>Weekly digest — Mondays</text>
    </CardContent>
    <CardFooter style={{ paddingBottom: 12 }}>
      <Button variant="secondary">Cancel</Button>
      <Button variant="primary" onActivate={save}>
        Save changes
      </Button>
    </CardFooter>
  </Card>
);`;

const dialogSource = `import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@gpuixui/components/dialog";

export function RenameProject() {
  return (
    <Dialog>
      <DialogTrigger variant="primary">Rename project</DialogTrigger>
      <DialogContent label="Rename project">
        <DialogHeader>
          <DialogTitle>Rename project</DialogTitle>
          <DialogDescription>
            Used in the window title and in every path that references the
            project.
          </DialogDescription>
        </DialogHeader>
        <input aria-label="Project name" defaultValue="Hunter License" />
        <DialogFooter>
          <DialogClose variant="ghost">Cancel</DialogClose>
          <DialogClose variant="primary">Save changes</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}`;

const popoverSource = `import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@gpuixui/components/popover";

<Popover>
  <PopoverTrigger variant="secondary">Columns</PopoverTrigger>
  <PopoverContent side="bottom" align="start" sideOffset={6}>
    <text role="heading" aria-level={3}>
      Visible columns
    </text>
    <text>Choose which fields a run summary shows.</text>
  </PopoverContent>
</Popover>;`;

const tabsSource = `import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@gpuixui/components/tabs";

<Tabs defaultValue="profile">
  <TabsList label="Account settings">
    <TabsTrigger value="profile">Profile</TabsTrigger>
    <TabsTrigger value="notifications">Notifications</TabsTrigger>
    <TabsTrigger value="billing">Billing</TabsTrigger>
  </TabsList>
  <TabsContent value="profile">
    <text>The name, avatar and timezone of the current account.</text>
  </TabsContent>
  <TabsContent value="notifications">
    <text>Desktop alerts for runs that finish, fail or need attention.</text>
  </TabsContent>
  <TabsContent value="billing">
    <text>The plan, seats and invoices for the workspace.</text>
  </TabsContent>
</Tabs>;`;

const shellSource = `import { Box, ScrollArea, Separator, Stack, Text, useTheme } from "@gpuixui/primitives";

export function AppFrame() {
  const theme = useTheme();
  return (
    <Box tone="background" style={{ display: "flex", height: 460, overflow: "hidden" }}>
      <Box tone="card" style={{ width: 168, flexShrink: 0 }}>
        <Stack direction="column" gap="2xs" style={{ padding: theme.spacing.sm }}>
          <Text role="label">Atlas</Text>
          <Text role="body" tone="primary">Overview</Text>
          <Text role="body" tone="muted">Runs</Text>
          <Text role="body" tone="muted">Datasets</Text>
          <Text role="body" tone="muted">Settings</Text>
        </Stack>
      </Box>

      <Stack direction="column" grow style={{ minWidth: 0 }}>
        <Stack
          direction="row"
          align="center"
          justify="between"
          style={{ height: 36, paddingLeft: theme.spacing.md, paddingRight: theme.spacing.md }}
        >
          <Text role="h3">Overview</Text>
          <Text role="caption" tone="muted">3 open runs</Text>
        </Stack>
        <Separator orientation="horizontal" />
        <ScrollArea axis="vertical" style={{ flex: 1 }}>
          <Stack direction="column" gap="sm" style={{ padding: theme.spacing.md }}>
            <Box tone="card" border radius="md" padding="sm">
              <Text role="body">Build #481 — passed in 2m 14s</Text>
            </Box>
            <Box tone="card" border radius="md" padding="sm">
              <Text role="body">Nightly export — 62% of 4.2 GB</Text>
            </Box>
          </Stack>
        </ScrollArea>
      </Stack>
    </Box>
  );
}`;

const dropdownMenuSource = `import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@gpuixui/components/dropdown-menu";
import { useState } from "react";

export function FileActions({ name }: { name: string }) {
  const [showHidden, setShowHidden] = useState(false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger variant="secondary" size="sm">
        Actions
      </DropdownMenuTrigger>
      <DropdownMenuContent label="File actions" align="end">
        <DropdownMenuItem onSelect={() => rename(name)}>Rename</DropdownMenuItem>
        <DropdownMenuItem disabled>Duplicate</DropdownMenuItem>
        <DropdownMenuCheckboxItem
          checked={showHidden}
          onCheckedChange={setShowHidden}
        >
          Show hidden files
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem tone="destructive" onSelect={() => remove(name)}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}`;

const commandMenuSource = `import {
  CommandMenu,
  CommandMenuEmpty,
  CommandMenuInput,
  CommandMenuList,
} from "@gpuixui/components/command-menu";
import { useState } from "react";

const actions = [
  { id: "new-file", label: "New file", group: "File", shortcut: "⌘N", perform: newFile },
  { id: "open-file", label: "Open file", group: "File", shortcut: "⌘O", perform: openFile },
  { id: "save", label: "Save", group: "File", shortcut: "⌘S", perform: save },
  { id: "sidebar", label: "Toggle sidebar", group: "View", shortcut: "⌘B", perform: toggleSidebar },
];

export function Palette() {
  const [open, setOpen] = useState(false);

  return (
    <CommandMenu open={open} onOpenChange={setOpen} actions={actions}>
      <CommandMenuInput placeholder="Type a command…" />
      <CommandMenuList />
      <CommandMenuEmpty>No matching commands</CommandMenuEmpty>
    </CommandMenu>
  );
}`;

export const demos: Readonly<Record<string, Demo>> = {
  "button-variants": { render: ButtonRow, source: buttonSource },
  "button-sizes": { render: ButtonSizes, source: sizeSource },
  "button-states": { render: ButtonStates, source: stateSource },
  "card-variants": { render: CardVariants, source: cardVariantsSource },
  "card-composition": {
    render: CardComposition,
    source: cardCompositionSource,
    composition: true,
  },
  "command-menu-demo": {
    render: CommandMenuDemo,
    source: commandMenuSource,
  },
  "dialog-demo": { render: DialogDemo, source: dialogSource },
  "dropdown-menu-demo": {
    render: DropdownMenuDemo,
    source: dropdownMenuSource,
  },
  "layout-shell": {
    render: LayoutShell,
    source: shellSource,
    composition: true,
  },
  "popover-demo": { render: PopoverDemo, source: popoverSource },
  "tabs-demo": { render: TabsDemo, source: tabsSource },
};
