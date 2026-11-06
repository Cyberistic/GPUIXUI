import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  dropIndex,
  moveTabTo,
  shiftsFor,
  type TabBox,
} from "./reorderable-tabs-logic";

/**
 * A tab strip whose tabs can be dragged into a new order and closed.
 *
 * The browser's half of the editor chrome the landing page opens inside its
 * terminal block: a tab follows the pointer, its neighbours open a gap with a
 * CSS transform, and the release snaps the tab into the gap before the caller
 * receives the new order. Closing collapses the tab's own width first, so the
 * strip closes the hole instead of cutting a tab out of the frame.
 *
 * The component owns the gesture and the animation; the caller owns the order
 * and which tab is open (`tabs`, `active`, `onReorder`, `onClose`), so a replay
 * or an explorer press can put a closed tab back. Tabs are a single roving tab
 * stop, arrows move the selection and `Alt`+Left/Right moves the tab itself.
 */

/** One tab on the rail. */
export interface ReorderableTab {
  readonly id: string;
  readonly label: string;
  readonly leading?: ReactNode;
}

/** Props for {@link ReorderableTabs}. */
export interface ReorderableTabsProps {
  readonly tabs: ReadonlyArray<ReorderableTab>;
  /** The open tab, or `null` when every tab is closed. */
  readonly active: string | null;
  /** The accessible name of the strip. */
  readonly label: string;
  readonly onActivate: (id: string) => void;
  readonly onReorder: (tabs: ReadonlyArray<ReorderableTab>) => void;
  readonly onClose: (id: string) => void;
  readonly className?: string;
  readonly tabClassName?: string;
  readonly closeClassName?: string;
}

/** How far a pointer must travel before a press becomes a drag. */
const DRAG_THRESHOLD = 4;
/** How long the tab takes to snap into the gap. */
const DROP_MS = 160;
/** How long a closing tab takes to collapse. */
const CLOSE_MS = 180;

interface Drag {
  readonly id: string;
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly boxes: ReadonlyArray<TabBox>;
  readonly rest: ReadonlyArray<TabBox>;
  readonly active: boolean;
  readonly dropping: boolean;
  readonly dx: number;
  readonly target: number;
}

interface Closing {
  readonly id: string;
  readonly width: number;
  readonly collapsed: boolean;
}

/**
 * The tab strip. See {@link ReorderableTabsProps}.
 */
export function ReorderableTabs({
  tabs,
  active,
  label,
  onActivate,
  onReorder,
  onClose,
  className,
  tabClassName,
  closeClassName,
}: ReorderableTabsProps) {
  const list = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const focusAfter = useRef(false);
  const pendingClear = useRef(false);
  const dropTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [closing, setClosing] = useState<Closing | null>(null);
  const [settling, setSettling] = useState(false);

  useEffect(
    () => () => {
      if (dropTimer.current !== null) clearTimeout(dropTimer.current);
      if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    },
    [],
  );

  /** The rail's viewport x, the origin the pointer's clientX is measured from. */
  const railLeft = useCallback(
    (): number => list.current?.getBoundingClientRect().left ?? 0,
    [],
  );

  /** The painted boxes of the tabs that are not being closed. */
  const measure = useCallback((): ReadonlyArray<TabBox> => {
    const rail = list.current;
    if (rail === null) return [];
    return Array.from(
      rail.querySelectorAll<HTMLElement>("[data-reorder-tab]"),
    ).flatMap((element) => {
      if (element.dataset.closing === "true") return [];
      const id = element.dataset.reorderTab;
      if (id === undefined) return [];
      return [{ id, left: element.offsetLeft, width: element.offsetWidth }];
    });
  }, []);

  /** Focus the tab named by `id`, once React has painted the new order. */
  const focusTab = useCallback((id: string): void => {
    const rail = list.current;
    if (rail === null) return;
    const element = Array.from(
      rail.querySelectorAll<HTMLElement>("[data-reorder-tab]"),
    ).find((candidate) => candidate.dataset.reorderTab === id);
    element?.focus();
  }, []);

  /** Move the selection and the focus to a tab by its index. */
  const selectAt = (index: number): void => {
    const tab = tabs[index];
    if (tab === undefined) return;
    onActivate(tab.id);
    focusTab(tab.id);
  };

  const step = (event: KeyboardEvent<HTMLDivElement>, index: number): void => {
    const last = tabs.length - 1;
    if (last < 0) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const delta = event.key === "ArrowRight" ? 1 : -1;
      if (event.altKey) {
        const target = Math.max(0, Math.min(last, index + delta));
        if (target === index) return;
        focusAfter.current = true;
        onReorder(moveTabTo(tabs, tabs[index]?.id ?? "", target));
        return;
      }
      selectAt((index + delta + tabs.length) % tabs.length);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      selectAt(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      selectAt(last);
      return;
    }
  };

  const begin = (event: PointerEvent<HTMLDivElement>, id: string): void => {
    if (event.button !== 0 || closing !== null) return;
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      target.closest("[data-reorder-close]") !== null
    ) {
      return;
    }
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const next: Drag = {
      id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      boxes: [],
      rest: [],
      active: false,
      dropping: false,
      dx: 0,
      target: 0,
    };
    dragRef.current = next;
    setDrag(next);
  };

  const follow = (event: PointerEvent<HTMLDivElement>): void => {
    const current = dragRef.current;
    if (current === null || current.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (!current.active) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
        return;
      }
      const boxes = measure();
      if (boxes.every((box) => box.id !== current.id)) return;
      const rest = boxes.filter((box) => box.id !== current.id);
      const next: Drag = {
        ...current,
        active: true,
        boxes,
        rest,
        dx,
        target: dropIndex(rest, event.clientX, railLeft()),
      };
      dragRef.current = next;
      setDrag(next);
      return;
    }
    const next: Drag = {
      ...current,
      dx,
      target: dropIndex(current.rest, event.clientX, railLeft()),
    };
    dragRef.current = next;
    setDrag(next);
  };

  /** Snap the dragged tab into its gap, then hand the order to the caller. */
  const drop = (event: PointerEvent<HTMLDivElement>): void => {
    const current = dragRef.current;
    if (current === null || current.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId) === true) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!current.active) {
      setDrag(null);
      return;
    }
    const dragged = current.boxes.find((box) => box.id === current.id);
    const destination = shiftsFor(
      current.boxes,
      current.id,
      current.target,
    ).dragged;
    const snapping: Drag = {
      ...current,
      dropping: true,
      dx: dragged === undefined ? 0 : destination,
    };
    dragRef.current = snapping;
    setDrag(snapping);
    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);
    dropTimer.current = setTimeout(() => {
      const ordered = moveTabTo(tabs, current.id, current.target);
      pendingClear.current = true;
      onReorder(ordered);
      // The caller owns the order, so the clearing happens in a layout effect
      // once the new array arrives. If the caller refuses the move, this is the
      // fallback that returns the strip to the order it still holds.
      dropTimer.current = setTimeout(() => {
        if (!pendingClear.current) return;
        pendingClear.current = false;
        setSettling(true);
        dragRef.current = null;
        setDrag(null);
      }, 80);
    }, DROP_MS);
  };

  const cancel = (): void => {
    dragRef.current = null;
    setDrag(null);
  };

  /** Collapse the tab's measured width before the caller removes it. */
  const close = (
    event: PointerEvent<HTMLButtonElement> | MouseEvent<HTMLButtonElement>,
    tab: ReorderableTab,
  ): void => {
    event.stopPropagation();
    if (closing !== null) return;
    const element =
      event.currentTarget.closest<HTMLElement>("[data-reorder-tab]");
    if (element === null) return;
    const width = element.getBoundingClientRect().width;
    focusAfter.current = true;
    setClosing({ id: tab.id, width, collapsed: false });
    closeTimer.current = setTimeout(() => {
      setClosing(null);
      onClose(tab.id);
    }, CLOSE_MS);
  };

  useEffect(() => {
    if (closing === null || closing.collapsed) return undefined;
    const frame = requestAnimationFrame(() => {
      setClosing((current) =>
        current === null || current.id !== closing.id
          ? current
          : { ...current, collapsed: true },
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [closing]);

  useLayoutEffect(() => {
    if (!pendingClear.current) return;
    pendingClear.current = false;
    // The order is about to move under the transforms. Suppress the transform
    // transition for this commit, or the browser animates the cleared offset
    // again while the base position has already changed — the second, phantom
    // swap after the tab was dropped.
    setSettling(true);
    dragRef.current = null;
    setDrag(null);
  }, [tabs]);

  useEffect(() => {
    if (!settling) return undefined;
    const frame = requestAnimationFrame(() => setSettling(false));
    return () => cancelAnimationFrame(frame);
  }, [settling]);

  useLayoutEffect(() => {
    if (!focusAfter.current) return;
    focusAfter.current = false;
    if (active !== null) focusTab(active);
  }, [active, focusTab, tabs]);

  const shifts =
    drag !== null && drag.active
      ? shiftsFor(drag.boxes, drag.id, drag.target)
      : null;
  const draggedBox =
    drag !== null && drag.active
      ? drag.boxes.find((box) => box.id === drag.id)
      : undefined;
  const dropLeft =
    drag !== null && drag.active && draggedBox !== undefined && shifts !== null
      ? draggedBox.left + shifts.dragged
      : undefined;
  const dropWidth =
    drag !== null && drag.active ? draggedBox?.width : undefined;
  const tabbable =
    active !== null && tabs.some((tab) => tab.id === active)
      ? active
      : tabs[0]?.id;

  return (
    <div
      aria-label={label}
      aria-orientation="horizontal"
      className={["gx-reorder-tabs", className].filter(Boolean).join(" ")}
      data-settling={settling}
      ref={list}
      role="tablist"
    >
      {dropLeft === undefined ? null : (
        <span
          aria-hidden="true"
          className="gx-reorder-indicator"
          style={{ left: dropLeft, width: dropWidth }}
        />
      )}
      {tabs.map((tab, index) => {
        const isDragged = drag?.id === tab.id && drag.active;
        const isClosing = closing?.id === tab.id;
        const shift = isDragged
          ? drag.dx
          : shifts === null
            ? 0
            : (shifts.others[tab.id] ?? 0);
        return (
          <div
            aria-selected={active === tab.id}
            className={["gx-reorder-tab", tabClassName]
              .filter(Boolean)
              .join(" ")}
            data-active={active === tab.id}
            data-closing={isClosing}
            data-dragging={isDragged && !drag.dropping}
            data-dropping={isDragged && drag.dropping}
            data-reorder-tab={tab.id}
            draggable={false}
            key={tab.id}
            onClick={() => {
              if (suppressClick.current) {
                suppressClick.current = false;
                return;
              }
              onActivate(tab.id);
            }}
            onKeyDown={(event) => {
              const target = event.target;
              if (
                target instanceof HTMLElement &&
                target.closest("[data-reorder-close]") !== null
              ) {
                return;
              }
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onActivate(tab.id);
                return;
              }
              step(event, index);
            }}
            onPointerCancel={cancel}
            onPointerDown={(event) => begin(event, tab.id)}
            onPointerMove={follow}
            onPointerUp={drop}
            role="tab"
            style={{
              transform:
                shift === 0 ? undefined : `translate3d(${shift}px, 0, 0)`,
              width: isClosing
                ? closing.collapsed
                  ? 0
                  : closing.width
                : undefined,
            }}
            tabIndex={tabbable === tab.id ? 0 : -1}
          >
            {tab.leading}
            <span className="gx-reorder-tab-label">{tab.label}</span>
            <button
              aria-label={`Close ${tab.label}`}
              className={["gx-reorder-close", closeClassName]
                .filter(Boolean)
                .join(" ")}
              data-reorder-close=""
              onClick={(event) => close(event, tab)}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              type="button"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
