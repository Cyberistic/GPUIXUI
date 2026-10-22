import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  activeFilterCount,
  describeIssues,
  dismissTop,
  drawerBox,
  filterIssues,
  initialFilter,
  type DrawerSize,
  type DrawerSide,
  type Issue,
  type IssueFilter,
} from "./drawer-preview";

/**
 * Browser previews for the Drawer page.
 *
 * The shipped drawer is a modal panel anchored to a window edge: it veils the
 * whole window, keeps one tab stop inside the surface, closes on Escape or an
 * outside press unless `dismissible={false}`, and returns focus to its opener.
 * The drawing takes the same rules — focus moves in on open and back to the
 * button that opened it, Tab wraps inside the panel, and the backdrop is the
 * only outside-press target — so a reader pressing through the preview meets
 * the component's contract rather than a generic slide-over.
 *
 * Geometry comes from `drawer-preview.ts`, which reads the component's own
 * size tables in its test. The page says the paint is an approximation: the
 * native surface is square (its recipe names no radius) and travels 12px on an
 * inset, while this drawing is static.
 */

/** The logical window the drawing is laid out in. */
const PREVIEW_WINDOW = { width: 560, height: 340 } as const;

/** The focusable controls inside the surface, for the Tab wrap. */
const focusableInside = (root: HTMLElement): ReadonlyArray<HTMLElement> => [
  ...root.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
  ),
];

/**
 * The modal's Tab trap.
 *
 * The native trap calls `focusNextWithin`/`focusPreviousWithin` after
 * cancelling the platform's default move; a page has to do the wrap itself.
 */
const trapTab = (event: KeyboardEvent, root: HTMLElement): void => {
  const items = focusableInside(root);
  const first = items[0];
  const last = items[items.length - 1];
  if (first === undefined || last === undefined) return;

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

/**
 * The open state, the opener to restore focus to, and the panel to focus.
 *
 * `dismissible` gates Escape here for the same reason the component gates its
 * dismiss layer: a surface that cannot be left must consume the key, not pass
 * it to whatever is underneath.
 */
const useDrawer = (dismissible: boolean) => {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    trigger.current?.focus();
  }, []);

  const openFrom = (event: ReactMouseEvent<HTMLButtonElement>) => {
    trigger.current = event.currentTarget;
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) {
        close();
        return;
      }
      if (event.key === "Tab" && panel.current !== null) {
        trapTab(event, panel.current);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, dismissible, open]);

  return { open, openFrom, close, panel };
};

interface DrawerSurfaceProps {
  readonly side: DrawerSide;
  readonly size: DrawerSize;
  readonly title: string;
  readonly description: string;
  readonly panelRef: RefObject<HTMLDivElement | null>;
  /** The close control's action: it always closes. */
  readonly onClose: () => void;
  /** A backdrop press. `undefined` while the drawer is not dismissible. */
  readonly onBackdrop?: () => void;
  readonly children: ReactNode;
  readonly footer: ReactNode;
}

/**
 * The veil and the edge surface, at the box the component computes.
 *
 * The backdrop is `inset: 0` over the drawing's window, as the native veil is
 * the whole window; a press inside the surface stops there rather than closing.
 */
const DrawerSurface = ({
  side,
  size,
  title,
  description,
  panelRef,
  onClose,
  onBackdrop,
  children,
  footer,
}: DrawerSurfaceProps) => {
  const box = drawerBox(side, size, PREVIEW_WINDOW);

  return (
    <div
      className="gx-drawer-backdrop"
      onClick={onBackdrop}
      role="presentation"
    >
      <div
        aria-label={title}
        aria-modal="true"
        className="gx-drawer"
        data-side={side}
        onClick={(event) => event.stopPropagation()}
        ref={panelRef}
        role="dialog"
        style={{ width: box.width, height: box.height }}
        tabIndex={-1}
      >
        <button
          aria-label="Close drawer"
          className="gx-drawer-close"
          onClick={onClose}
          type="button"
        >
          ✕
        </button>
        <div className="gx-drawer-header">
          <h2 className="gx-drawer-title">{title}</h2>
          <p className="gx-drawer-desc">{description}</p>
        </div>
        <div className="gx-drawer-body">{children}</div>
        <div className="gx-drawer-footer">{footer}</div>
      </div>
    </div>
  );
};

/** The issue set the workflow drawer narrows. */
const issues: ReadonlyArray<Issue> = [
  {
    id: "ISS-412",
    title: "Export fails on a large board",
    status: "open",
    assigned: true,
    attachment: false,
  },
  {
    id: "ISS-407",
    title: "Keyboard trap in the palette",
    status: "open",
    assigned: false,
    attachment: true,
  },
  {
    id: "ISS-398",
    title: "Colour pass for the dark theme",
    status: "closed",
    assigned: true,
    attachment: true,
  },
  {
    id: "ISS-391",
    title: "Slow first paint on Linux",
    status: "open",
    assigned: false,
    attachment: false,
  },
];

const FilterChoice = ({
  checked,
  children,
  onChange,
  type,
  name,
}: {
  readonly checked: boolean;
  readonly children: ReactNode;
  readonly onChange: () => void;
  readonly type: "checkbox" | "radio";
  readonly name: string;
}) => (
  <label className="gx-drawer-field">
    <input checked={checked} name={name} onChange={onChange} type={type} />
    <span>{children}</span>
  </label>
);

/** A filter button that opens the drawer over the list it narrows. */
const DrawerWorkflow = () => {
  const [applied, setApplied] = useState<IssueFilter>(initialFilter);
  const [draft, setDraft] = useState<IssueFilter>(initialFilter);
  const { open, openFrom, close, panel } = useDrawer(true);
  const shown = filterIssues(issues, applied);
  const count = activeFilterCount(applied);

  const showFilters = (event: ReactMouseEvent<HTMLButtonElement>) => {
    setDraft(applied);
    openFrom(event);
  };

  return (
    <div className="gx-demo gx-drawer-scene">
      <div className="gx-drawer-frame">
        <div className="gx-drawer-appbar">
          <span className="gx-drawer-apptitle">Issues</span>
          <button
            className="gx-btn gx-btn-secondary"
            onClick={showFilters}
            type="button"
          >
            Filters{count === 0 ? "" : ` · ${count}`}
          </button>
        </div>
        <p className="gx-drawer-readout" role="status">
          {describeIssues(shown.length, issues.length)}
        </p>
        <ul className="gx-drawer-issues">
          {shown.map((issue) => (
            <li
              className="gx-drawer-issue"
              data-status={issue.status}
              key={issue.id}
            >
              <span aria-hidden="true" className="gx-drawer-dot" />
              <span className="gx-drawer-issue-title">{issue.title}</span>
              <span className="gx-drawer-issue-meta">{issue.id}</span>
            </li>
          ))}
          {shown.length === 0 ? (
            <li className="gx-drawer-empty">No issues match these filters.</li>
          ) : null}
        </ul>

        {open ? (
          <DrawerSurface
            description="Narrow the list. The drawer is app state: applying it closes the surface and re-runs the filter."
            footer={
              <>
                <button
                  className="gx-btn gx-btn-ghost"
                  onClick={() => setDraft(initialFilter)}
                  type="button"
                >
                  Reset
                </button>
                <button
                  className="gx-btn gx-btn-primary"
                  onClick={() => {
                    setApplied(draft);
                    close();
                  }}
                  type="button"
                >
                  Apply filters
                </button>
              </>
            }
            onClose={close}
            onBackdrop={close}
            panelRef={panel}
            side="right"
            size="md"
            title="Filters"
          >
            <div className="gx-drawer-group">
              <span className="gx-drawer-legend">Status</span>
              <FilterChoice
                checked={draft.status === "all"}
                name="gx-drawer-status"
                onChange={() => setDraft({ ...draft, status: "all" })}
                type="radio"
              >
                All issues
              </FilterChoice>
              <FilterChoice
                checked={draft.status === "open"}
                name="gx-drawer-status"
                onChange={() => setDraft({ ...draft, status: "open" })}
                type="radio"
              >
                Open only
              </FilterChoice>
            </div>
            <div className="gx-drawer-group">
              <span className="gx-drawer-legend">Narrow further</span>
              <FilterChoice
                checked={draft.assignedOnly}
                name="gx-drawer-assigned"
                onChange={() =>
                  setDraft({ ...draft, assignedOnly: !draft.assignedOnly })
                }
                type="checkbox"
              >
                Assigned to me
              </FilterChoice>
              <FilterChoice
                checked={draft.attachmentsOnly}
                name="gx-drawer-attachments"
                onChange={() =>
                  setDraft({
                    ...draft,
                    attachmentsOnly: !draft.attachmentsOnly,
                  })
                }
                type="checkbox"
              >
                Has an attachment
              </FilterChoice>
            </div>
            <p className="gx-drawer-preview-count" role="status">
              {describeIssues(
                filterIssues(issues, draft).length,
                issues.length,
              )}
            </p>
          </DrawerSurface>
        ) : null}
      </div>
    </div>
  );
};

const sides: ReadonlyArray<{ side: DrawerSide; label: string }> = [
  { side: "right", label: "From the right" },
  { side: "left", label: "From the left" },
  { side: "bottom", label: "From the bottom" },
];

/** The three edges and three sizes, with the dismissal switch. */
const DrawerSides = () => {
  const [side, setSide] = useState<DrawerSide>("right");
  const [size, setSize] = useState<DrawerSize>("md");
  const [dismissible, setDismissible] = useState(true);
  const { open, openFrom, close, panel } = useDrawer(dismissible);
  const outcome = dismissTop([
    { name: "dialog", dismissible: true },
    { name: "drawer", dismissible },
  ]);

  return (
    <div className="gx-demo gx-drawer-scene">
      <div className="gx-drawer-frame">
        <div className="gx-drawer-appbar">
          <span className="gx-drawer-apptitle">Drawer geometry</span>
          <label className="gx-drawer-field">
            <span>Size</span>
            <select
              className="gx-field gx-drawer-select"
              onChange={(event) => {
                const next = event.currentTarget.value;
                if (next === "sm" || next === "md" || next === "lg") {
                  setSize(next);
                }
              }}
              value={size}
            >
              <option value="sm">sm</option>
              <option value="md">md</option>
              <option value="lg">lg</option>
            </select>
          </label>
        </div>
        <div className="gx-drawer-actions">
          {sides.map((entry) => (
            <button
              className="gx-btn gx-btn-secondary"
              key={entry.side}
              onClick={(event) => {
                setSide(entry.side);
                openFrom(event);
              }}
              type="button"
            >
              {entry.label}
            </button>
          ))}
          <label className="gx-drawer-field">
            <input
              checked={dismissible}
              onChange={() => setDismissible((current) => !current)}
              type="checkbox"
            />
            <span>Dismissible</span>
          </label>
        </div>
        <p className="gx-drawer-readout" role="status">
          {outcome.closed === "drawer"
            ? "Escape closes the drawer; the dialog underneath stays open."
            : "Escape is consumed by the drawer; the dialog underneath stays open."}
        </p>
        <p className="gx-drawer-hint">
          A <code>lg</code> column is 560px wide; a bottom sheet is the
          window&apos;s width and at most 420px tall. Both are capped by the
          window.
        </p>

        {open ? (
          <DrawerSurface
            description={`side="${side}" · size="${size}"`}
            footer={
              <button
                className="gx-btn gx-btn-primary"
                onClick={close}
                type="button"
              >
                Close
              </button>
            }
            onClose={close}
            onBackdrop={dismissible ? close : undefined}
            panelRef={panel}
            side={side}
            size={size}
            title="Surface geometry"
          >
            <p className="gx-drawer-copy">
              The surface is the theme&apos;s <code>popover</code> fill with a{" "}
              <code>border</code> edge and the <code>elevation.lg</code> lift.
              It is square: the recipe names no radius utility.
            </p>
            <p className="gx-drawer-copy">
              {dismissible
                ? "Escape and a press on the backdrop close it."
                : "dismissible={false}: Escape and a backdrop press are consumed and close nothing."}
            </p>
          </DrawerSurface>
        ) : null}
      </div>
    </div>
  );
};

const workflowSource = `import { useState } from "react";
import { Checkbox } from "@gpuixui/primitives";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@gpuixui/components/drawer";

type Filter = {
  openOnly: boolean;
  assignedOnly: boolean;
  attachmentsOnly: boolean;
};

export const IssueFilters = () => {
  const [filter, setFilter] = useState<Filter>({
    openOnly: false,
    assignedOnly: false,
    attachmentsOnly: false,
  });
  const [draft, setDraft] = useState(filter);

  return (
    <Drawer>
      <DrawerTrigger>Filters</DrawerTrigger>
      <DrawerContent label="Filters" side="right" size="md">
        <DrawerHeader>
          <DrawerTitle>Filters</DrawerTitle>
          <DrawerDescription>
            Narrow the list. Applying closes the drawer and re-runs the filter.
          </DrawerDescription>
        </DrawerHeader>
        <Checkbox
          checked={draft.openOnly}
          label="Open only"
          onCheckedChange={(openOnly) => setDraft({ ...draft, openOnly })}
        />
        <Checkbox
          checked={draft.assignedOnly}
          label="Assigned to me"
          onCheckedChange={(assignedOnly) =>
            setDraft({ ...draft, assignedOnly })
          }
        />
        <DrawerFooter>
          <DrawerClose variant="ghost">Cancel</DrawerClose>
          <DrawerClose variant="primary" onClick={() => setFilter(draft)}>
            Apply filters
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};`;

const sidesSource = `import { useState } from "react";
import { Button } from "@gpuixui/primitives";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@gpuixui/components/drawer";
import type { DrawerSide, DrawerSize } from "@gpuixui/components/drawer";

export const Geometry = () => {
  const [side, setSide] = useState<DrawerSide>("right");
  const [size, setSize] = useState<DrawerSize>("md");

  return (
    <>
      <Button onClick={() => setSide("left")}>From the left</Button>
      <Button onClick={() => setSide("right")}>From the right</Button>
      <Button onClick={() => setSide("bottom")}>From the bottom</Button>
      <Button onClick={() => setSize("lg")}>Large</Button>

      <Drawer>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerContent label="Surface geometry" side={side} size={size}>
          <DrawerHeader>
            <DrawerTitle>Surface geometry</DrawerTitle>
            <DrawerDescription>
              A column takes the window's height; a bottom sheet takes its width.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <DrawerClose>Close</DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* An uninterruptible drawer refuses Escape and a backdrop press. */}
      <Drawer dismissible={false}>
        <DrawerTrigger>Uploading…</DrawerTrigger>
        <DrawerContent label="Uploading" side="bottom" size="sm">
          <DrawerClose>Cancel upload</DrawerClose>
        </DrawerContent>
      </Drawer>
    </>
  );
};`;

export {
  DrawerSides,
  DrawerWorkflow,
  sidesSource as drawerSidesSource,
  workflowSource as drawerWorkflowSource,
};
