import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePreviewInteractive } from "./preview-surface";
import {
  POPOVER_ALIGNMENTS,
  alignLabel,
  alignmentLayout,
  type PopoverAlign,
} from "./popover-alignment";
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

const usePopover = () => {
  const [open, setOpen] = useState(true);
  const scene = useRef<HTMLDivElement | null>(null);
  const interactive = usePreviewInteractive();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open || !interactive) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const onPress = (event: MouseEvent) => {
      if (!scene.current?.contains(event.target as Node)) close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPress);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPress);
    };
  }, [close, interactive, open]);

  return { close, open, scene, setOpen };
};

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

export const PopoverAligned = ({
  align: initialAlign = "center",
}: {
  readonly align?: PopoverAlign;
} = {}): ReactNode => {
  const [align, setAlign] = useState<PopoverAlign>(initialAlign);
  const { close, open, scene, setOpen } = usePopover();
  const layout = alignmentLayout(align);

  return (
    <div className="gx-demo-popover gx-popover-aligned" ref={scene}>
      <div aria-label="Popover align" className="gx-tgroup" role="group">
        {POPOVER_ALIGNMENTS.map((name) => (
          <button
            aria-pressed={align === name}
            className="gx-btn gx-toggle gx-toggle-outline"
            data-pressed={align === name ? "" : undefined}
            key={name}
            onClick={() => {
              setAlign(name);
              setOpen(true);
            }}
            type="button"
          >
            {alignLabel(name)}
          </button>
        ))}
      </div>
      <div className="gx-popover-stage" style={{ width: POPOVER_FRAME_WIDTH }}>
        <div className="gx-popover-anchor">
          <button
            aria-expanded={open}
            className="gx-btn gx-btn-secondary"
            onClick={open ? close : () => setOpen(true)}
            style={{ width: POPOVER_TRIGGER_WIDTH }}
            type="button"
          >
            Columns
          </button>
          {open ? (
            <div
              aria-label={`Popover aligned ${align}`}
              className="gx-popover"
              data-align={align}
              role="dialog"
              style={{ left: layout.offset, width: POPOVER_PANEL_WIDTH }}
            >
              <PanelBody note="Choose which fields a run summary shows. The setting is per project." />
            </div>
          ) : null}
        </div>
      </div>
      <p className="gx-popover-readout" role="status">
        align=&quot;{align}&quot; · panel left {layout.left} · shift{" "}
        {layout.shifted}
      </p>
    </div>
  );
};

export const PopoverSides = (): ReactNode => {
  const [side, setSide] = useState<PopoverSide>("bottom");
  const { close, open, scene, setOpen } = usePopover();

  return (
    <div className="gx-demo-popover gx-popover-sides" ref={scene}>
      <div aria-label="Popover side" className="gx-tgroup" role="group">
        {POPOVER_SIDES.map((name) => (
          <button
            aria-pressed={side === name}
            className="gx-btn gx-toggle gx-toggle-outline"
            data-pressed={side === name ? "" : undefined}
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
        <div className="gx-popover-anchor">
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

export const PopoverCollision = (): ReactNode => {
  const { close, open, scene, setOpen } = usePopover();
  const layout = collisionLayout();

  return (
    <div className="gx-demo-popover gx-popover-sides" ref={scene}>
      <div
        className="gx-popover-stage gx-popover-stage-edge"
        style={{ width: POPOVER_FRAME_WIDTH }}
      >
        <div className="gx-popover-anchor">
          <button
            aria-expanded={open}
            className="gx-btn gx-btn-secondary"
            onClick={open ? close : () => setOpen(true)}
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
