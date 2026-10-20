/**
 * `Surface` — a leaf box whose pixels are owned by an adapter.
 *
 * GPUIx 0.10.0 has no foreign-view seam (plan `437` §1), but it does paint an
 * `<img>` host and accepts RGBA pixels through `setImagePixels`. This component
 * is the honest library half of that seam: it reserves one box, creates the
 * adapter, tells it the authored bounds and theme mode, and destroys it on
 * unmount. It does not invent a native view, a layout callback or an input
 * route the runtime cannot provide (plan `696`).
 */

import {
  useGpuix,
  type ImgInstance,
  type PublicInstance,
  type StyleDesc,
} from "@gpuix/react";
import { Effect } from "effect";
import { focusRing } from "@gpuixui/tokens";
import * as Fiber from "effect/Fiber";
import * as Option from "effect/Option";
import {
  useCallback,
  useEffect,
  useRef,
  type ReactElement,
  type Ref,
} from "react";
import {
  surfaceError,
  type SurfaceAdapter,
  type SurfaceBounds,
  type SurfaceError,
  type SurfaceHost,
} from "../surface/adapter.js";
import { ariaName, mergeStyle, useFocus } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

/** The props of the `Surface` leaf. */
export interface SurfaceProps {
  /** The adapter that owns the pixels and the lifecycle. */
  readonly adapter: SurfaceAdapter;
  /** Authored width in logical pixels; there is no layout read-back in 0.10.0. */
  readonly width: number;
  /** Authored height in logical pixels; there is no layout read-back in 0.10.0. */
  readonly height: number;
  /** The surface's accessible name. A blank label leaves it unnamed. */
  readonly label: string;
  /** Caller style, merged last over the host's own box. */
  readonly style?: StyleDesc;
  /** Makes the leaf a focus stop and routes focus to `adapter.focus()`. */
  readonly tabIndex?: number;
  /** The host's test id, for runtime locators. */
  readonly testId?: string;
  /** Receives a typed lifecycle failure. Without one, the failure is logged. */
  readonly onError?: (error: SurfaceError) => void;
}

/** A 1×1 transparent PNG: makes the host a real img before the first frame lands. */
const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

/** The element seam, exported for the element-tree guard rather than the root. */
export interface RenderSurfaceProps {
  readonly width: number;
  readonly height: number;
  readonly label: string;
  readonly style?: StyleDesc;
  readonly tabIndex?: number;
  readonly testId?: string;
  readonly elementRef: Ref<PublicInstance>;
  readonly imageRef: Ref<ImgInstance>;
  readonly onFocus?: () => void;
  readonly onBlur?: () => void;
}

/**
 * Render the one host element a surface owns.
 *
 * The caller's style wins last, as everywhere in this package; `width` and
 * `height` are the adapter's bounds, so a caller that overrides them owns the
 * mismatch (there is no layout read-back).
 */
export const renderSurface = ({
  width,
  height,
  label,
  style,
  tabIndex,
  testId,
  elementRef,
  imageRef,
  onFocus,
  onBlur,
}: RenderSurfaceProps): ReactElement => {
  const name = ariaName(label);
  const focusTab = name === undefined ? undefined : tabIndex;
  return (
    <div
      ref={elementRef}
      testId={testId}
      tabIndex={focusTab}
      role={focusTab === undefined ? undefined : "group"}
      aria-label={focusTab === undefined ? undefined : name}
      onFocus={onFocus}
      onBlur={onBlur}
      style={mergeStyle({ width, height, display: "flex" }, style)}
    >
      <img
        ref={imageRef}
        src={TRANSPARENT_PIXEL}
        alt={focusTab === undefined ? name : undefined}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
};

/**
 * A leaf whose pixels belong to an adapter.
 *
 * Mount order is `create → resize → setVisible(true) → setTheme`; unmount is
 * `setVisible(false) → destroy`. A later bounds change resizes, a theme-mode
 * change re-themes (a raster adapter repaints), and a new adapter destroys the
 * old session first. The surface is presentational: a static surface exposes one
 * named image node; a `tabIndex` surface is a named group whose image is
 * decorative, and it has no interior keyboard contract.
 */
export const Surface = ({
  adapter,
  width,
  height,
  label,
  style,
  tabIndex,
  testId,
  onError,
}: SurfaceProps): ReactElement => {
  const theme = useTheme();
  const { renderer } = useGpuix();
  const imageRef = useRef<ImgInstance | null>(null);
  const focus = useFocus();
  const focusRef = useRef(false);
  const live = useRef(false);
  const boundsRef = useRef<SurfaceBounds>({ width, height });
  const modeRef = useRef(theme.mode);
  const appliedBounds = useRef<Option.Option<SurfaceBounds>>(Option.none());
  const appliedMode = useRef<Option.Option<string>>(Option.none());
  const errorRef = useRef(onError);

  boundsRef.current = { width, height };
  modeRef.current = theme.mode;
  focusRef.current = focus.focused;
  const hostRef = useCallback(
    (instance: PublicInstance | null) => {
      focus.ref?.(instance);
    },
    [focus.ref],
  );
  errorRef.current = onError;

  const report = (error: SurfaceError): void => {
    const handler = errorRef.current;
    if (handler !== undefined) {
      handler(error);
      return;
    }
    Effect.runFork(
      Effect.logError(error.message).pipe(
        Effect.annotateLogs({ surface: error.operation }),
      ),
    );
  };

  const run = (effect: Effect.Effect<void, SurfaceError>): void => {
    Effect.runFork(
      effect.pipe(Effect.catch((error) => Effect.sync(() => report(error)))),
    );
  };

  useEffect(() => {
    const element = imageRef.current;
    if (element === null) {
      report(surfaceError("create", "the surface host is not mounted"));
      return;
    }

    const host: SurfaceHost = {
      elementId: element.id,
      ...(renderer === null ? {} : { renderer }),
      setPixels: (nextWidth, nextHeight, pixels) =>
        element.setImagePixels(nextWidth, nextHeight, pixels),
    };

    live.current = false;
    const session = adapter.create(host).pipe(
      Effect.andThen(Effect.suspend(() => adapter.resize(boundsRef.current))),
      Effect.andThen(adapter.setVisible(true)),
      Effect.andThen(Effect.suspend(() => adapter.setTheme(modeRef.current))),
      Effect.andThen(
        Effect.suspend(() =>
          focusRef.current ? adapter.focus() : Effect.void,
        ),
      ),
      Effect.tap(() =>
        Effect.sync(() => {
          live.current = true;
          appliedBounds.current = Option.some(boundsRef.current);
          appliedMode.current = Option.some(modeRef.current);
        }),
      ),
      Effect.catch((error) => Effect.sync(() => report(error))),
    );
    const fiber = Effect.runFork(session);

    return () => {
      live.current = false;
      appliedBounds.current = Option.none();
      appliedMode.current = Option.none();
      Effect.runFork(Fiber.interrupt(fiber));
      run(
        adapter.setVisible(false).pipe(
          Effect.catch((error) => Effect.sync(() => report(error))),
          Effect.andThen(adapter.destroy()),
        ),
      );
    };
  }, [adapter, renderer]);

  useEffect(() => {
    const next = { width, height };
    if (!live.current) return;
    if (
      Option.exists(
        appliedBounds.current,
        (bounds) => bounds.width === width && bounds.height === height,
      )
    ) {
      return;
    }
    appliedBounds.current = Option.some(next);
    run(adapter.resize(next));
  }, [adapter, width, height]);

  useEffect(() => {
    if (!focus.focused || !live.current) return;
    run(adapter.focus());
  }, [adapter, focus.focused]);

  useEffect(() => {
    if (!live.current) return;
    if (Option.contains(appliedMode.current, theme.mode)) return;
    appliedMode.current = Option.some(theme.mode);
    run(adapter.setTheme(theme.mode));
  }, [adapter, theme.mode]);

  return renderSurface({
    width,
    height,
    label,
    style: mergeStyle(focus.focused ? focusRing(theme) : {}, style),
    tabIndex,
    testId,
    elementRef: hostRef,
    imageRef,
    onFocus: focus.onFocus,
    onBlur: focus.onBlur,
  });
};
