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
  filterIssues,
  initialFilter,
  isVertical,
  type DrawerSide,
  type DrawerSize,
  type Issue,
  type IssueFilter,
} from "./drawer-preview";
import { usePreviewInteractive } from "./preview-surface";

/**
 * The sheet and drawer drawings: the surface each page is about.
 *
 * Both scenes **open on the surface**. The server markup carries the dialog, so
 * the first paint is a picture of the drawer rather than an empty stage, and a
 * press on the visible trigger opens it again for the slide. The geometry,
 * corners, lift, grabber and travel live in `demos.css`, read out of
 * `drawer.tsx` by `sheet-drawer-preview.test.ts`; `drawer-preview.ts` owns the
 * arithmetic a drawing cannot show (the dismiss stack, the filter).
 */

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
    last.focus({ preventScroll: true });
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus({ preventScroll: true });
  }
};

/**
 * The scene's open state, the opener to restore focus to, and the panel.
 *
 * The scene starts open, so the still is legible without a press, and only a
 * reader's own press moves focus into the panel. Every focus passes
 * `preventScroll`: the browser's `focus()` scrolls a mid-slide surface into
 * view, which cancels the animation, while the native renderer never scrolls.
 */
const useDrawer = (dismissible: boolean) => {
  const interactive = usePreviewInteractive();
  const [open, setOpen] = useState(true);
  const openedByReader = useRef(false);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }, []);

  const openFrom = (event: ReactMouseEvent<HTMLButtonElement>) => {
    trigger.current = event.currentTarget;
    openedByReader.current = true;
    setOpen(true);
  };

  useEffect(() => {
    if (!open || !interactive) return;
    if (openedByReader.current) {
      openedByReader.current = false;
      panel.current?.focus({ preventScroll: true });
    }

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
  }, [close, dismissible, interactive, open]);

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
 * The veil and the edge surface, at the component's own geometry.
 *
 * The backdrop is `inset: 0` over the drawing's window, as the native veil is
 * the whole window; the surface's box comes from `data-side`/`data-size` in the
 * style sheet, so it is anchored to an edge and clamped by the frame. A press
 * inside the surface stops there rather than closing.
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
}: DrawerSurfaceProps) => (
  <div
    className="gx-drawer-backdrop gx-overlay-veil"
    onClick={onBackdrop}
    role="presentation"
  >
    <div
      aria-label={title}
      aria-modal="true"
      className="gx-drawer"
      data-side={side}
      data-size={size}
      onClick={(event) => event.stopPropagation()}
      ref={panelRef}
      role="dialog"
      tabIndex={-1}
    >
      {isVertical(side) ? (
        <div aria-hidden="true" className="gx-drawer-grabber" />
      ) : null}
      <div className="gx-drawer-panel">
        <div className="gx-drawer-header">
          <h2 className="gx-drawer-title">{title}</h2>
          <p className="gx-drawer-desc">{description}</p>
        </div>
        <div className="gx-drawer-body">{children}</div>
        <div className="gx-drawer-footer">{footer}</div>
      </div>
      <button
        aria-label="Close drawer"
        className="gx-drawer-close"
        onClick={onClose}
        type="button"
      >
        ✕
      </button>
    </div>
  </div>
);

const sides: ReadonlyArray<{ side: DrawerSide; label: string }> = [
  { side: "right", label: "From the right" },
  { side: "left", label: "From the left" },
  { side: "bottom", label: "From the bottom" },
  { side: "top", label: "From the top" },
];

const sizes: ReadonlyArray<DrawerSize> = ["sm", "md", "lg"];

const isDrawerSize = (value: string): value is DrawerSize =>
  sizes.some((size) => size === value);

/** The measurement the drawing's window is: every edge and size, live. */
const SheetDrawing = () => {
  const [side, setSide] = useState<DrawerSide>("right");
  const [size, setSize] = useState<DrawerSize>("md");
  const [dismissible, setDismissible] = useState(true);
  const { open, openFrom, close, panel } = useDrawer(dismissible);
  const outcome = dismissTop([
    { name: "dialog", dismissible: true },
    ...(open ? [{ name: "drawer", dismissible }] : []),
  ]);
  const story =
    outcome.closed === "drawer"
      ? "Escape closes the drawer; the dialog underneath stays open."
      : outcome.closed === "dialog"
        ? "The drawer is closed; Escape reaches the dialog underneath."
        : "dismissible={false}: Escape is consumed, and the dialog underneath stays open.";

  return (
    <div className="gx-demo gx-drawer-scene">
      <div className="gx-drawer-toolbar">
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
          <span>Size</span>
          <select
            className="gx-field gx-drawer-select"
            onChange={(event) => {
              const next = event.currentTarget.value;
              if (isDrawerSize(next)) setSize(next);
            }}
            value={size}
          >
            {sizes.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        <label className="gx-drawer-field">
          <input
            checked={dismissible}
            onChange={() => setDismissible((current) => !current)}
            type="checkbox"
          />
          <span>Dismissible</span>
        </label>
      </div>
      <p className="gx-drawer-hint" role="status">
        {story}
      </p>
      <div className="gx-drawer-frame">
        <div className="gx-drawer-appbar">
          <span className="gx-drawer-apptitle">Sheet geometry</span>
          <span className="gx-drawer-readout">
            side=&quot;{side}&quot; · size=&quot;{size}&quot;
          </span>
        </div>
        <p className="gx-drawer-copy gx-drawer-page">
          The frame is the window: the sheet is anchored to one edge, its own
          span outside that edge at the start of the slide, and clamped to the
          window in the direction it asks for.
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
            onBackdrop={dismissible ? close : undefined}
            onClose={close}
            panelRef={panel}
            side={side}
            size={size}
            title="Surface geometry"
          >
            <p className="gx-drawer-copy">
              The surface is the theme&apos;s <code>popover</code> fill with a{" "}
              <code>border</code> edge, the <code>elevation.lg</code> lift and
              the inner corners rounded — the window edge stays flush.
            </p>
            <p className="gx-drawer-copy">
              A column takes the window&apos;s height; a top or bottom sheet
              takes its width and wears the grabber.
            </p>
          </DrawerSurface>
        ) : null}
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

/** The filter drawer over the list it narrows, on the window's right edge. */
const DrawerDrawing = () => {
  const [applied, setApplied] = useState<IssueFilter>(initialFilter);
  const [draft, setDraft] = useState<IssueFilter>(initialFilter);
  const { open, openFrom, close, panel } = useDrawer(true);
  const shown = filterIssues(issues, applied);
  const count = activeFilterCount(applied);

  return (
    <div className="gx-demo gx-drawer-scene">
      <div className="gx-drawer-toolbar">
        <button
          className="gx-btn gx-btn-secondary"
          onClick={(event) => {
            setDraft(applied);
            openFrom(event);
          }}
          type="button"
        >
          Filters{count === 0 ? "" : ` · ${count}`}
        </button>
        <p className="gx-drawer-readout" role="status">
          {describeIssues(shown.length, issues.length)}
        </p>
      </div>
      <div className="gx-drawer-frame">
        <div className="gx-drawer-appbar">
          <span className="gx-drawer-apptitle">Issues</span>
        </div>
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
            onBackdrop={close}
            onClose={close}
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
      <Button onClick={() => setSide("right")}>From the right</Button>
      <Button onClick={() => setSide("left")}>From the left</Button>
      <Button onClick={() => setSide("bottom")}>From the bottom</Button>
      <Button onClick={() => setSide("top")}>From the top</Button>
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
  DrawerDrawing,
  DrawerSurface,
  sidesSource as drawerSidesSource,
  SheetDrawing,
  workflowSource as drawerWorkflowSource,
};
