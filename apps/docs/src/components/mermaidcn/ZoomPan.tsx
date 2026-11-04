import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  fitView,
  initialView,
  MAX_SCALE,
  MIN_SCALE,
  panBy,
  percentOf,
  wheelFactor,
  zoomTo,
  type ZoomView,
} from "./zoom";

/**
 * A generic zoom-and-pan canvas.
 *
 * mermaidcn's shape is kept — `children`, `className`, `minScale`, `maxScale`,
 * `initialScale`, `zoomStep`, a `controls` render prop and a loading overlay —
 * because the wrapper is useful for any drawing, not only a diagram. The wheel
 * zooms around the pointer, a primary/middle drag pans, and the control prop
 * gets the four actions and the percentage. Pinch is the one gesture left to a
 * later pass: Pele's own `enableZoom` carries it, and this wrapper trades that
 * for React-owned content and a fit-to-view control.
 */

/** The values the controls render prop receives. */
export interface ZoomPanApi {
  readonly zoomIn: () => void;
  readonly zoomOut: () => void;
  readonly resetZoom: () => void;
  readonly centerView: () => void;
  readonly scalePercent: number;
}

/** Props for {@link ZoomPan}. */
export interface ZoomPanProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly minScale?: number;
  readonly maxScale?: number;
  readonly initialScale?: number;
  readonly zoomStep?: number;
  readonly controls?: (api: ZoomPanApi) => ReactNode;
  readonly isLoading?: boolean;
  readonly loadingFallback?: ReactNode;
  /**
   * Fit and centre the content when this value changes. Omit to keep the
   * caller's starting scale. A playground passes its template id, so a new
   * template opens fitted while typing keeps the reader's zoom.
   */
  readonly fitOn?: unknown;
}

/** The canvas. See {@link ZoomPanProps}. */
export function ZoomPan({
  children,
  className,
  minScale = MIN_SCALE,
  maxScale = MAX_SCALE,
  initialScale = 1,
  zoomStep = 0.1,
  controls,
  isLoading = false,
  loadingFallback,
  fitOn,
}: ZoomPanProps) {
  const canvas = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<ZoomView>(initialView(initialScale));
  const drag = useRef<{
    readonly pointerId: number;
    x: number;
    y: number;
  } | null>(null);
  const [view, setView] = useState<ZoomView>(() => initialView(initialScale));
  const [immediate, setImmediate] = useState(false);

  const commit = useCallback((next: ZoomView, instant: boolean): void => {
    viewRef.current = next;
    setImmediate(instant);
    setView(next);
  }, []);

  /** A point in the canvas' coordinates, for a viewport event. */
  const localPoint = (
    clientX: number,
    clientY: number,
  ): { readonly x: number; readonly y: number } => {
    const box = canvas.current?.getBoundingClientRect();
    return box === undefined
      ? { x: clientX, y: clientY }
      : { x: clientX - box.left, y: clientY - box.top };
  };

  const zoomBy = useCallback(
    (
      factor: number,
      point: { readonly x: number; readonly y: number },
    ): void => {
      commit(
        zoomTo(
          viewRef.current,
          viewRef.current.scale * factor,
          point,
          minScale,
          maxScale,
        ),
        false,
      );
    },
    [commit, maxScale, minScale],
  );

  const zoomIn = useCallback((): void => {
    const box = canvas.current?.getBoundingClientRect();
    zoomBy(1 + zoomStep, {
      x: (box?.width ?? 0) / 2,
      y: (box?.height ?? 0) / 2,
    });
  }, [zoomBy, zoomStep]);

  const zoomOut = useCallback((): void => {
    const box = canvas.current?.getBoundingClientRect();
    zoomBy(1 - zoomStep, {
      x: (box?.width ?? 0) / 2,
      y: (box?.height ?? 0) / 2,
    });
  }, [zoomBy, zoomStep]);

  const resetZoom = useCallback((): void => {
    commit(initialView(initialScale), false);
  }, [commit, initialScale]);

  const centerView = useCallback((): void => {
    const element = canvas.current;
    const content = element?.firstElementChild;
    if (element === undefined || element === null) return;
    if (!(content instanceof HTMLElement)) return;
    const box = element.getBoundingClientRect();
    const size = {
      width: Math.max(content.scrollWidth, content.offsetWidth),
      height: Math.max(content.scrollHeight, content.offsetHeight),
    };
    if (size.width === 0 || size.height === 0) return;
    commit(
      fitView(
        size,
        { width: box.width, height: box.height },
        40,
        minScale,
        maxScale,
      ),
      false,
    );
  }, [commit, maxScale, minScale]);

  useEffect(() => {
    if (fitOn === undefined) return undefined;
    const frame = requestAnimationFrame(centerView);
    return () => cancelAnimationFrame(frame);
  }, [centerView, fitOn]);

  useEffect(() => {
    const element = canvas.current;
    if (element === null || isLoading) return undefined;
    const wheel = (event: WheelEvent): void => {
      event.preventDefault();
      const point = localPoint(event.clientX, event.clientY);
      zoomBy(wheelFactor(event.deltaY, event.deltaMode), point);
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [isLoading, zoomBy]);

  const press = (event: PointerEvent<HTMLDivElement>): void => {
    if (isLoading || (event.button !== 0 && event.button !== 1)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    setImmediate(true);
  };

  const move = (event: PointerEvent<HTMLDivElement>): void => {
    const current = drag.current;
    if (current === null || current.pointerId !== event.pointerId) return;
    commit(
      panBy(
        viewRef.current,
        event.clientX - current.x,
        event.clientY - current.y,
      ),
      true,
    );
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  };

  const release = (event: PointerEvent<HTMLDivElement>): void => {
    const current = drag.current;
    if (current === null || current.pointerId !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setImmediate(false);
  };

  const transform: CSSProperties = {
    transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
    transformOrigin: "0 0",
    willChange: "transform",
    transition: immediate
      ? "none"
      : "transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)",
  };

  return (
    <div className={["gx-zoompan", className].filter(Boolean).join(" ")}>
      {controls?.({
        zoomIn,
        zoomOut,
        resetZoom,
        centerView,
        scalePercent: percentOf(view.scale),
      })}
      <div
        className="gx-zoompan-canvas"
        data-zoom-pan=""
        onPointerCancel={release}
        onPointerDown={press}
        onPointerMove={move}
        onPointerUp={release}
        ref={canvas}
      >
        <div
          className="gx-zoompan-content"
          data-zoom-content=""
          style={transform}
        >
          {children}
        </div>
        {isLoading ? (
          <div className="gx-zoompan-loading">
            {loadingFallback ?? <span>Rendering diagram…</span>}
          </div>
        ) : null}
      </div>
    </div>
  );
}
