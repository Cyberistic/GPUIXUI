import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  focusAfterClose,
  idleTyped,
  keyboardAnchor,
  pointerAnchor,
  typeChar,
  type CloseReason,
  type OpenSource,
  type Point,
  type TypedBuffer,
} from "./context-menu-preview";

/**
 * Browser previews for the Context menu page.
 *
 * The shipped menu is opened by a right press on its trigger (0.11.0 has no
 * `onContextMenu`, so the aux click's point is used) or by `Shift+F10` at the
 * trigger's bottom-left, and it restores focus only when it was opened from the
 * keyboard. The drawing takes the same routes — it listens for the browser's
 * `contextmenu` event and for `Shift+F10`, computes its point the same way, and
 * prints where focus went — so a reader pressing through the preview meets the
 * component's contract rather than a generic right-click popup.
 *
 * Geometry comes from `context-menu-preview.ts`, whose test reads the shipped
 * component and type-ahead module. The page says the paint is an approximation:
 * the native surface is an `anchored` layer at window coordinates and keeps its
 * box for a 200 ms exit, while this drawing paints inside the preview frame and
 * removes the surface at once.
 */

interface Row {
  readonly id: string;
  readonly label: string;
  readonly kind?: "checkbox" | "submenu";
  readonly tone?: "destructive";
  readonly disabled?: boolean;
}

const rows: ReadonlyArray<Row> = [
  { id: "open", label: "Open" },
  { id: "rename", label: "Rename" },
  { id: "copy-path", label: "Copy path" },
  { id: "share", label: "Share", kind: "submenu" },
  { id: "hidden", label: "Show hidden files", kind: "checkbox" },
  { id: "delete", label: "Delete", tone: "destructive" },
];

const shareRows: ReadonlyArray<Row> = [
  { id: "copy-link", label: "Copy link" },
  { id: "email", label: "Email" },
];

const enabled = (list: ReadonlyArray<Row>): ReadonlyArray<Row> =>
  list.filter((row) => row.disabled !== true);

/** The next enabled row in `rows`, wrapping at both ends. */
const step = (
  list: ReadonlyArray<Row>,
  current: string | null,
  delta: 1 | -1,
): string | null => {
  const list_ = enabled(list);
  if (list_.length === 0) return null;
  const index =
    current === null ? -1 : list_.findIndex((row) => row.id === current);
  const next =
    delta === 1
      ? (index + 1) % list_.length
      : index <= 0
        ? list_.length - 1
        : index - 1;
  return list_[next]?.id ?? null;
};

const describeClose = (reason: CloseReason): string => {
  switch (reason) {
    case "activate":
      return "running a row";
    case "dismiss":
      return "Escape";
    case "leave":
      return "Tab";
    case "outside":
      return "a press outside";
  }
};

interface SurfaceProps {
  readonly point: Point;
  readonly source: OpenSource;
  readonly onClose: (reason: CloseReason, action?: string) => void;
  readonly onActivate: (row: Row) => void;
  readonly checked: boolean;
}

/**
 * The menu surface: rows, the second level and the key contract.
 *
 * The highlight is the focus, as in the shipped component: a row focused by an
 * arrow key, a click or type-ahead is the row `Enter` runs. The surface itself
 * takes focus after a pointer open, which is why a pointer-opened menu has no
 * row highlighted and dismisses with the focus `none`.
 */
const ContextSurface = ({
  point,
  source,
  onClose,
  onActivate,
  checked,
}: SurfaceProps) => {
  const [highlight, setHighlight] = useState<string | null>(() =>
    source === "keyboard" ? (step(rows, null, 1) ?? null) : null,
  );
  const [submenu, setSubmenu] = useState(false);
  const [subHighlight, setSubHighlight] = useState<string | null>(null);
  const surface = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const subRefs = useRef(new Map<string, HTMLButtonElement>());
  const buffer = useRef<TypedBuffer>(idleTyped);

  const focusRow = (id: string | null) => {
    if (id === null) return;
    setHighlight(id);
    rowRefs.current.get(id)?.focus();
  };

  const focusSubRow = (id: string | null) => {
    if (id === null) return;
    setSubHighlight(id);
    subRefs.current.get(id)?.focus();
  };

  /** Close the second level and put the focus back on the row that opened it. */
  const closeSubmenu = () => {
    setSubmenu(false);
    setSubHighlight(null);
    focusRow("share");
  };

  const activate = (row: Row) => {
    if (row.kind === "submenu") {
      setSubmenu(true);
      setSubHighlight(null);
      focusSubRow(step(shareRows, null, 1));
      return;
    }
    onActivate(row);
    // A checkbox row stays open, exactly as the shared menu row does.
    if (row.kind !== "checkbox") onClose("activate", row.label);
  };

  useEffect(() => {
    if (source === "keyboard") {
      rowRefs.current.get(highlight ?? "")?.focus();
    } else {
      surface.current?.focus();
    }
  }, [highlight, source]);

  useEffect(() => {
    const onPress = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (surface.current?.contains(target) === true) return;
      onClose("outside");
    };
    window.addEventListener("mousedown", onPress);
    return () => window.removeEventListener("mousedown", onPress);
  }, [onClose]);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const { key } = event;
    if (submenu) {
      if (key === "Escape" || key === "ArrowLeft") {
        event.preventDefault();
        closeSubmenu();
        return;
      }
      if (key === "ArrowDown" || key === "ArrowUp") {
        event.preventDefault();
        focusSubRow(
          step(shareRows, subHighlight, key === "ArrowDown" ? 1 : -1),
        );
        return;
      }
      if (key === "Enter" || key === " ") {
        event.preventDefault();
        const row = shareRows.find((entry) => entry.id === subHighlight);
        if (row !== undefined) activate(row);
        return;
      }
    } else {
      if (key === "ArrowDown" || key === "ArrowUp") {
        event.preventDefault();
        focusRow(step(rows, highlight, key === "ArrowDown" ? 1 : -1));
        return;
      }
      if (key === "Home" || key === "End") {
        event.preventDefault();
        const list = enabled(rows);
        focusRow(
          (key === "Home" ? list[0] : list[list.length - 1])?.id ?? null,
        );
        return;
      }
      if (key === "ArrowRight" && highlight === "share") {
        event.preventDefault();
        activate({ id: "share", label: "Share", kind: "submenu" });
        return;
      }
      if (key === "Escape") {
        event.preventDefault();
        onClose("dismiss");
        return;
      }
    }
    if (key === "Tab") {
      onClose("leave");
      return;
    }
    if (key === "Enter" || key === " ") {
      event.preventDefault();
      const row = rows.find((entry) => entry.id === highlight);
      if (row !== undefined) activate(row);
      return;
    }
    if (key.length === 1 && key !== " ") {
      const index =
        highlight === null
          ? undefined
          : rows.findIndex((row) => row.id === highlight);
      const next = typeChar(rows, index, buffer.current, key, Date.now());
      buffer.current = next.buffer;
      if (next.index !== undefined) focusRow(rows[next.index]?.id ?? null);
    }
  };

  return (
    <div
      aria-label="Project actions"
      className="gx-menu gx-context-surface"
      onKeyDown={onKeyDown}
      ref={surface}
      role="menu"
      style={{ left: point.x, top: point.y }}
      tabIndex={-1}
    >
      {rows.map((row) => (
        <button
          aria-checked={row.kind === "checkbox" ? checked : undefined}
          aria-haspopup={row.kind === "submenu" ? "menu" : undefined}
          className="gx-menu-row"
          data-highlighted={highlight === row.id}
          data-tone={row.tone}
          disabled={row.disabled}
          key={row.id}
          onClick={() => activate(row)}
          onFocus={() => setHighlight(row.id)}
          ref={(element) => {
            if (element === null) rowRefs.current.delete(row.id);
            else rowRefs.current.set(row.id, element);
          }}
          role={row.kind === "checkbox" ? "menuitemcheckbox" : "menuitem"}
          tabIndex={-1}
          type="button"
        >
          <span>{row.label}</span>
          {row.kind === "submenu" ? (
            <span aria-hidden="true" className="gx-context-chevron">
              ›
            </span>
          ) : null}
          {row.kind === "checkbox" ? (
            <span aria-hidden="true" className="gx-menu-check">
              {checked ? "✓" : ""}
            </span>
          ) : null}
        </button>
      ))}
      {submenu ? (
        <div aria-label="Share" className="gx-menu gx-context-sub" role="menu">
          {shareRows.map((row) => (
            <button
              className="gx-menu-row"
              data-highlighted={subHighlight === row.id}
              key={row.id}
              onClick={() => activate(row)}
              onFocus={() => setSubHighlight(row.id)}
              ref={(element) => {
                if (element === null) subRefs.current.delete(row.id);
                else subRefs.current.set(row.id, element);
              }}
              role="menuitem"
              tabIndex={-1}
              type="button"
            >
              <span>{row.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

interface FileRow {
  readonly id: string;
  readonly name: string;
  readonly meta: string;
}

const files: ReadonlyArray<FileRow> = [
  { id: "notes", name: "release-notes.md", meta: "Edited 2 min ago" },
  { id: "schema", name: "ata-schema.json", meta: "Edited yesterday" },
  { id: "runs", name: "runs/", meta: "12 files" },
];

/** The workflow: a file list whose rows carry the project menu. */
const ContextMenuWorkflow = () => {
  const scene = useRef<HTMLDivElement | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [point, setPoint] = useState<Point>({ x: 0, y: 0 });
  const [source, setSource] = useState<OpenSource>("pointer");
  const [trigger, setTrigger] = useState("release-notes.md");
  const [checked, setChecked] = useState(false);
  const [readout, setReadout] = useState(
    "Right-click a file, or press Shift+F10 on one.",
  );

  const openAt = (
    event: { readonly currentTarget: HTMLElement },
    next: Point,
    from: OpenSource,
    label: string,
  ) => {
    opener.current = event.currentTarget;
    setTrigger(label);
    setPoint(next);
    setSource(from);
    setReadout(
      `${from === "keyboard" ? "Shift+F10" : "Right press"} opened at x=${next.x}, y=${next.y}.`,
    );
    setOpen(true);
  };

  const pointInScene = (event: ReactMouseEvent): Point => {
    const box = scene.current?.getBoundingClientRect();
    return pointerAnchor({
      x: Math.round(event.clientX - (box?.left ?? 0)),
      y: Math.round(event.clientY - (box?.top ?? 0)),
    });
  };

  const close = (reason: CloseReason, action?: string) => {
    setOpen(false);
    const focus = focusAfterClose(source, reason);
    setReadout(
      `${action === undefined ? "" : `${action} ran once — `}${describeClose(reason)} closed it — focus ${
        focus === "trigger" ? `returned to ${trigger}` : "none"
      }.`,
    );
    if (focus === "trigger") opener.current?.focus();
    else {
      const active = document.activeElement;
      if (active instanceof HTMLElement) active.blur();
    }
  };

  const activate = (row: Row) => {
    if (row.kind === "checkbox") {
      setChecked((current) => !current);
    }
  };

  return (
    <div className="gx-demo gx-context-scene" ref={scene}>
      <div className="gx-context-files">
        <p className="gx-demo-label">Files</p>
        {files.map((file) => (
          <button
            className="gx-context-row"
            data-open={file.name === trigger && open}
            key={file.id}
            onContextMenu={(event) => {
              event.preventDefault();
              openAt(
                { currentTarget: event.currentTarget },
                pointInScene(event),
                "pointer",
                file.name,
              );
            }}
            onKeyDown={(event) => {
              if (event.key !== "F10" && event.key !== "ContextMenu") return;
              if (event.key === "F10" && !event.shiftKey) return;
              event.preventDefault();
              const box = event.currentTarget.getBoundingClientRect();
              const sceneBox = scene.current?.getBoundingClientRect();
              openAt(
                { currentTarget: event.currentTarget },
                keyboardAnchor({
                  x: Math.round(box.left - (sceneBox?.left ?? 0)),
                  y: Math.round(box.top - (sceneBox?.top ?? 0)),
                  width: box.width,
                  height: box.height,
                }),
                "keyboard",
                file.name,
              );
            }}
            type="button"
          >
            <span>{file.name}</span>
            <span className="gx-context-row-meta">{file.meta}</span>
          </button>
        ))}
      </div>
      <p className="gx-context-readout" role="status">
        {readout}
      </p>

      {open ? (
        <ContextSurface
          checked={checked}
          onActivate={activate}
          onClose={close}
          point={point}
          source={source}
        />
      ) : null}
    </div>
  );
};

/** The states: both opening routes and the focus each close leaves. */
const ContextMenuStates = () => {
  const scene = useRef<HTMLDivElement | null>(null);
  const row = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [point, setPoint] = useState<Point>({ x: 0, y: 0 });
  const [source, setSource] = useState<OpenSource>("keyboard");
  const [checked, setChecked] = useState(false);

  const openAt = (next: Point, from: OpenSource) => {
    setPoint(next);
    setSource(from);
    setOpen(true);
  };

  const pointInScene = (event: ReactMouseEvent): Point => {
    const box = scene.current?.getBoundingClientRect();
    return pointerAnchor({
      x: Math.round(event.clientX - (box?.left ?? 0)),
      y: Math.round(event.clientY - (box?.top ?? 0)),
    });
  };

  const keyboardPoint = (): Point => {
    const box = row.current?.getBoundingClientRect();
    const sceneBox = scene.current?.getBoundingClientRect();
    return keyboardAnchor({
      x: Math.round((box?.left ?? 0) - (sceneBox?.left ?? 0)),
      y: Math.round((box?.top ?? 0) - (sceneBox?.top ?? 0)),
      width: box?.width ?? 0,
      height: box?.height ?? 0,
    });
  };

  return (
    <div className="gx-demo gx-context-scene" ref={scene}>
      <p className="gx-demo-label">Opening routes</p>
      <button
        className="gx-context-row"
        onContextMenu={(event) => {
          event.preventDefault();
          openAt(pointInScene(event), "pointer");
        }}
        onKeyDown={(event) => {
          if (event.key !== "F10" && event.key !== "ContextMenu") return;
          if (event.key === "F10" && !event.shiftKey) return;
          event.preventDefault();
          openAt(keyboardPoint(), "keyboard");
        }}
        ref={row}
        type="button"
      >
        <span>release-notes.md</span>
        <span className="gx-context-row-meta">right-click, or Shift+F10</span>
      </button>
      <p className="gx-context-readout" role="status">
        {open
          ? `${source === "keyboard" ? "Shift+F10" : "Right press"} opened at x=${point.x}, y=${point.y}.`
          : "Nothing open. Shift+F10 opens at the row's bottom-left."}
      </p>

      <table className="gx-context-matrix">
        <thead>
          <tr>
            <th scope="col">Close</th>
            <th scope="col">Keyboard open</th>
            <th scope="col">Pointer open</th>
          </tr>
        </thead>
        <tbody>
          {(["dismiss", "activate", "leave", "outside"] as const).map(
            (reason) => (
              <tr key={reason}>
                <th scope="row">{describeClose(reason)}</th>
                <td>{focusAfterClose("keyboard", reason)}</td>
                <td>{focusAfterClose("pointer", reason)}</td>
              </tr>
            ),
          )}
        </tbody>
      </table>

      {open ? (
        <ContextSurface
          checked={checked}
          onActivate={(entry) => {
            if (entry.kind === "checkbox") setChecked((current) => !current);
          }}
          onClose={() => setOpen(false)}
          point={point}
          source={source}
        />
      ) : null}
    </div>
  );
};

const workflowSource = `import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@gpuixui/components/context-menu";
import { useState } from "react";

export function ProjectActions({ name }: { name: string }) {
  const [showHidden, setShowHidden] = useState(false);

  return (
    <ContextMenu>
      {/* A right press arrives as onAuxClick with isRightClick on 0.11.0. */}
      <ContextMenuTrigger>
        <text>{name}</text>
      </ContextMenuTrigger>
      <ContextMenuContent label="Project actions">
        <ContextMenuItem onSelect={() => open(name)}>Open</ContextMenuItem>
        <ContextMenuItem onSelect={() => rename(name)}>Rename</ContextMenuItem>
        <ContextMenuItem onSelect={() => copyPath(name)}>Copy path</ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>Share</ContextMenuSubTrigger>
          <ContextMenuSubContent label="Share">
            <ContextMenuItem onSelect={copyLink}>Copy link</ContextMenuItem>
            <ContextMenuItem onSelect={email}>Email</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuCheckboxItem
          checked={showHidden}
          onCheckedChange={setShowHidden}
        >
          Show hidden files
        </ContextMenuCheckboxItem>
        <ContextMenuSeparator />
        <ContextMenuItem tone="destructive" onSelect={() => remove(name)}>
          Delete…
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}`;

const statesSource = `import { useRef } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@gpuixui/components/context-menu";

export function KeyboardRoute() {
  const row = useRef(null);

  return (
    <ContextMenu>
      {/* Focus the row and press Shift+F10: the surface opens at its
          bottom-left, and Escape returns the focus here. */}
      <ContextMenuTrigger ref={row} style={{ padding: 12 }}>
        <text>release-notes.md</text>
      </ContextMenuTrigger>
      <ContextMenuContent label="Project actions">
        <ContextMenuItem onSelect={open}>Open</ContextMenuItem>
        <ContextMenuItem onSelect={rename}>Rename</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}`;

export {
  ContextMenuStates,
  ContextMenuWorkflow,
  statesSource as contextMenuStatesSource,
  workflowSource as contextMenuWorkflowSource,
};
