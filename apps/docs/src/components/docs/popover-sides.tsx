import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePreviewInteractive } from "./preview-surface";
import {
  POPOVER_COLLISION_PADDING,
  POPOVER_FRAME_WIDTH,
  POPOVER_PANEL_WIDTH,
  POPOVER_SIDE_OFFSET,
  POPOVER_SIDES,
  POPOVER_TRIGGER_WIDTH,
  collisionLayout,
  sideLabel,
  type PopoverSide,
} from "./popover-preview";

/**
 * Browser previews for the Popover page's sides.
 *
 * The shipped popover takes a `side` and a `sideOffset`, keeps that side unless
 * it has no room at all, and lets the runtime pull a snapped surface back inside
 * the window by `collisionPadding`. The drawings show all four sides on one
 * trigger and a panel against the frame's right edge, where the pull-back is the
 * thing a reader needs to see. They are illustrations of the native surface —
 * the component renders through GPUix, not the DOM.
 */

const usePopover = () => {
  const [open, setOpen] = useState(true);
  const anchor = useRef<HTMLDivElement | null>(null);
  const interactive = usePreviewInteractive();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open || !interactive) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const onPress = (event: MouseEvent) => {
      if (!anchor.current?.contains(event.target as Node)) close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPress);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPress);
    };
  }, [close, interactive, open]);

  return { anchor, close, open, setOpen };
};

/** The panel's body, shared by both drawings. */
const PanelBody = ({ note }: { readonly note: ReactNode }): ReactNode => (
  <>
    <p className="gx-popover-title">Visible columns</p>
    <p className="gx-popover-body">{note}</p>
    <div className="gx-popover-meta">
      <span>3 of 7 shown</span>
      <b>Saved</b>
    </div>
  </>
);

/** The four sides, switched from one control row. */
export const PopoverSides = (): ReactNode => {
  const [side, setSide] = useState<PopoverSide>("bottom");
  const { anchor, close, open, setOpen } = usePopover();

  return (
    <div className="gx-demo-popover gx-popover-sides">
      <div
        aria-label="Popover side"
        className="gx-popover-sides-row"
        role="group"
      >
        {POPOVER_SIDES.map((name) => (
          <button
            aria-pressed={side === name}
            className="gx-btn gx-btn-sm gx-btn-secondary"
            key={name}
            onClick={() => {
              setSide(name);
              setOpen(true);
            }}
            type="button"
          >
            {sideLabel(name)}
          </button>
        ))}
      </div>
      <div className="gx-popover-stage" style={{ width: POPOVER_FRAME_WIDTH }}>
        <div className="gx-popover-anchor" ref={anchor}>
          <button
            aria-expanded={open}
            className="gx-btn gx-btn-secondary"
            onClick={open ? close : () => setOpen(true)}
            type="button"
          >
            Columns
          </button>
          {open ? (
            <div
              aria-label={`Popover on ${side}`}
              className="gx-popover gx-popover-sided"
              data-side={side}
              role="dialog"
              style={{ width: POPOVER_PANEL_WIDTH }}
            >
              <PanelBody
                note={
                  <>
                    A panel opens on <code>{side}</code> with a{" "}
                    {POPOVER_SIDE_OFFSET}px gap from its trigger.
                  </>
                }
              />
            </div>
          ) : null}
        </div>
      </div>
      <p className="gx-popover-readout" role="status">
        side=&quot;{side}&quot; · sideOffset {POPOVER_SIDE_OFFSET} · the other
        three sides keep the same gap
      </p>
    </div>
  );
};

/**
 * The collision pull-back, as the runtime does it.
 *
 * The trigger sits against the frame's right edge, so an `align="start"` panel
 * would paint past it; the surface slides back until its right edge keeps the
 * collision margin. The panel is a child of the frame rather than the trigger,
 * so the drawing's `left` is the box the readout prints — the number a reader
 * can check against the rule.
 */
export const PopoverCollision = (): ReactNode => {
  const { anchor, close, open } = usePopover();
  const layout = collisionLayout();

  return (
    <div className="gx-demo-popover gx-popover-sides">
      <div
        className="gx-popover-stage gx-popover-stage-edge"
        style={{ width: POPOVER_FRAME_WIDTH }}
      >
        <div className="gx-popover-anchor" ref={anchor}>
          <button
            aria-expanded={open}
            className="gx-btn gx-btn-secondary"
            onClick={close}
            style={{ width: POPOVER_TRIGGER_WIDTH }}
            type="button"
          >
            Columns
          </button>
        </div>
        {open ? (
          <div
            aria-label="Popover pulled back inside the frame"
            className="gx-popover gx-popover-sided gx-popover-collision"
            data-side="bottom"
            role="dialog"
            style={{ left: layout.left, width: POPOVER_PANEL_WIDTH }}
          >
            <PanelBody
              note={`The panel keeps its side and slides ${layout.pulledBack}px back inside the frame.`}
            />
          </div>
        ) : null}
      </div>
      <p className="gx-popover-readout" role="status">
        panel x {layout.left} · pulled back {layout.pulledBack}px · right margin{" "}
        {POPOVER_COLLISION_PADDING}
      </p>
    </div>
  );
};

const sidesSource = `import { Popover, PopoverContent, PopoverTrigger } from "@gpuixui/components/popover";

// The same trigger asks for a different side.
<Popover>
  <PopoverTrigger>Columns</PopoverTrigger>
  <PopoverContent side="top" align="start">
    <ColumnToggles />
  </PopoverContent>
</Popover>;

<Popover>
  <PopoverTrigger>Columns</PopoverTrigger>
  <PopoverContent side="right" align="start">
    <ColumnToggles />
  </PopoverContent>
</Popover>;

<Popover>
  <PopoverTrigger>Columns</PopoverTrigger>
  <PopoverContent side="bottom" align="start">
    <ColumnToggles />
  </PopoverContent>
</Popover>;

<Popover>
  <PopoverTrigger>Columns</PopoverTrigger>
  <PopoverContent side="left" align="start">
    <ColumnToggles />
  </PopoverContent>
</Popover>;`;

const collisionSource = `import { Popover, PopoverContent, PopoverTrigger } from "@gpuixui/components/popover";

// Near the window's right edge the surface keeps its side and slides back by
// the collision margin; a wider \`collisionPadding\` moves it further in.
<Popover>
  <PopoverTrigger>Columns</PopoverTrigger>
  <PopoverContent side="bottom" align="start" collisionPadding={8}>
    <ColumnToggles />
  </PopoverContent>
</Popover>;`;

export { collisionSource as popoverCollisionSource };
export { sidesSource as popoverSidesSource };
