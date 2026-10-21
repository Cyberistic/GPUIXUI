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
  type EventPayload,
  type ImgInstance,
  type PublicInstance,
  type StyleDesc,
} from "@gpuix/react";
import { Effect } from "effect";
import { focusRing } from "@gpuixui/tokens";
import * as Deferred from "effect/Deferred";
import * as Fiber from "effect/Fiber";
import * as Option from "effect/Option";
import { useEffect, useRef, type ReactElement, type Ref } from "react";
import {
  surfaceError,
  type SurfaceAdapter,
  type SurfaceBounds,
  type SurfaceError,
  type SurfaceHost,
} from "../surface/adapter.js";
import { surfaceBounds } from "../surface/bounds.js";
import {
  ariaName,
  composeHandler,
  composeRef,
  mergeStyle,
  passiveTriggerHandlers,
  useFocus,
  type TriggerHandlers,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

/** The props of the `Surface` leaf. */
export interface SurfaceProps extends TriggerHandlers {
  /** The adapter that owns the pixels and the lifecycle. */
  readonly adapter: SurfaceAdapter;
  /** Authored width in whole logical pixels; a fractional value floors. */
  readonly width: number;
  /** Authored height in whole logical pixels; a fractional value floors. */
  readonly height: number;
  /** The surface's accessible name. A blank label leaves it unnamed. */
  readonly label: string;
  /**
   * A repaint counter: any change repaints a live session at the same box.
   *
   * Bump it when the data your `paint` closure reads changes. A new `adapter`
   * identity rebuilds the session instead; an unrelated prop change repaints
   * nothing (plan `698`).
   */
  readonly revision?: number;
  /** Caller style, merged last over the host's own box. */
  readonly style?: StyleDesc;
  /** Makes the leaf a focus stop and routes focus to `adapter.focus()`. */
  readonly tabIndex?: number;
  /**
   * Extra description announced after the name. A slot (a `Tooltip`) writes the
   * tip here; only a focusable, labelled surface is a trigger.
   */
  readonly "aria-description"?: string;
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
  /** The slot contract, forwarded only when the surface is a focus stop. */
  readonly slot?: Omit<TriggerHandlers, "ref">;
  readonly description?: string;
  readonly style?: StyleDesc;
  readonly tabIndex?: number;
  readonly testId?: string;
  readonly elementRef: Ref<PublicInstance>;
  readonly imageRef: Ref<ImgInstance>;
  readonly onFocus?: (event: EventPayload) => void;
  readonly onBlur?: (event: EventPayload) => void;
}

/**
 * Render the one host element a surface owns.
 *
 * The caller's style wins last, as everywhere in this package. The authored size
 * is normalised to the paintable box here too, so the seam cannot paint a
 * fractional or `NaN` length even when it is called directly (plan `697`).
 *
 * A **focusable, labelled** surface is a single-root control, so it forwards the
 * slot contract the `Tooltip` clones onto it; a static surface has no focus path
 * and stays a named image with no handlers (plan `733`, the D49 rule).
 */
export const renderSurface = ({
  width,
  height,
  label,
  slot,
  description,
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
  const box = surfaceBounds({ width, height });
  return (
    <div
      ref={elementRef}
      testId={testId}
      tabIndex={focusTab}
      role={focusTab === undefined ? undefined : "group"}
      aria-label={focusTab === undefined ? undefined : name}
      {...(focusTab === undefined ? {} : passiveTriggerHandlers(slot ?? {}))}
      aria-description={
        focusTab === undefined ? undefined : ariaName(description)
      }
      onKeyDown={focusTab === undefined ? undefined : slot?.onKeyDown}
      onKeyUp={focusTab === undefined ? undefined : slot?.onKeyUp}
      onFocus={onFocus}
      onBlur={onBlur}
      style={mergeStyle(
        { width: box.width, height: box.height, display: "flex" },
        style,
      )}
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
 * old session first — the next `create` waits for that `destroy` to finish, so
 * two sessions never own the one host element at the same time. Focus is a pair:
 * the adapter hears `focus` when the host takes native focus and `blur` when it
 * loses the focus it was given, so a view that owns the inside of the box can
 * release it (plan `811`). The authored
 * size is normalised to whole, non-negative logical pixels — the box the host
 * paints and the bounds every adapter call receives (plan `697`). The surface is
 * presentational: a static surface exposes one named image node; a `tabIndex`
 * surface is a named group whose image is decorative, and it has no interior
 * keyboard contract.
 */
export const Surface = ({
  adapter,
  width,
  height,
  label,
  revision = 0,
  style,
  tabIndex,
  testId,
  onError,
  ...props
}: SurfaceProps): ReactElement => {
  const theme = useTheme();
  const { renderer } = useGpuix();
  const imageRef = useRef<ImgInstance | null>(null);
  const focus = useFocus();
  const focusRef = useRef(false);
  const live = useRef(false);
  /** Whether the adapter was told the host is focused, so `blur` is earned. */
  const adapterFocused = useRef(false);
  const bounds = surfaceBounds({ width, height });
  const boundsRef = useRef<SurfaceBounds>(bounds);
  const modeRef = useRef(theme.mode);
  const appliedBounds = useRef<Option.Option<SurfaceBounds>>(Option.none());
  const appliedMode = useRef<Option.Option<string>>(Option.none());
  const appliedRevision = useRef(revision);
  const errorRef = useRef(onError);
  /**
   * The teardown gate of the session currently mounted.
   *
   * A new adapter must not start its session until the old one has released the
   * one host element both of them target. The cleanup completes its own gate
   * after `destroy`; the next mount waits for the gate it found and replaces it
   * (plan `699`). A mount without a previous session sees `None` and starts at
   * once, and an unmount with no successor simply completes its gate.
   */
  const gate = useRef<Option.Option<Deferred.Deferred<void>>>(Option.none());

  boundsRef.current = bounds;
  modeRef.current = theme.mode;
  focusRef.current = focus.focused;
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

    const previous = gate.current;
    const completed = Deferred.makeUnsafe<void>();
    gate.current = Option.some(completed);

    live.current = false;
    adapterFocused.current = false;
    const session = Option.match(previous, {
      onNone: () => Effect.void,
      onSome: (pending) => Deferred.await(pending),
    }).pipe(
      Effect.andThen(adapter.create(host)),
      Effect.andThen(Effect.suspend(() => adapter.resize(boundsRef.current))),
      Effect.andThen(adapter.setVisible(true)),
      Effect.andThen(Effect.suspend(() => adapter.setTheme(modeRef.current))),
      Effect.andThen(
        Effect.suspend(() =>
          focusRef.current
            ? adapter.focus().pipe(
                Effect.tap(() =>
                  Effect.sync(() => {
                    adapterFocused.current = true;
                  }),
                ),
              )
            : Effect.void,
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
      adapterFocused.current = false;
      appliedBounds.current = Option.none();
      appliedMode.current = Option.none();
      Effect.runFork(Fiber.interrupt(fiber));
      run(
        adapter.setVisible(false).pipe(
          Effect.catch((error) => Effect.sync(() => report(error))),
          Effect.andThen(adapter.destroy()),
          Effect.catch((error) => Effect.sync(() => report(error))),
          Effect.ensuring(Deferred.succeed(completed, void 0)),
        ),
      );
    };
  }, [adapter, renderer]);

  useEffect(() => {
    const next = surfaceBounds({ width, height });
    if (!live.current) return;
    if (
      Option.exists(
        appliedBounds.current,
        (bounds) =>
          bounds.width === next.width && bounds.height === next.height,
      )
    ) {
      return;
    }
    appliedBounds.current = Option.some(next);
    run(adapter.resize(next));
  }, [adapter, width, height]);

  useEffect(() => {
    if (Object.is(appliedRevision.current, revision)) return;
    appliedRevision.current = revision;
    if (!live.current) return;
    run(adapter.resize(boundsRef.current));
  }, [adapter, revision]);

  useEffect(() => {
    if (!live.current) return;
    if (focus.focused === adapterFocused.current) return;
    adapterFocused.current = focus.focused;
    run(focus.focused ? adapter.focus() : adapter.blur());
  }, [adapter, focus.focused]);

  useEffect(() => {
    if (!live.current) return;
    if (Option.contains(appliedMode.current, theme.mode)) return;
    appliedMode.current = Option.some(theme.mode);
    run(adapter.setTheme(theme.mode));
  }, [adapter, theme.mode]);

  return renderSurface({
    width: bounds.width,
    height: bounds.height,
    label,
    slot: props,
    description: ariaName(props["aria-description"]),
    style: mergeStyle(focus.focused ? focusRing(theme) : {}, style),
    tabIndex,
    testId,
    elementRef: composeRef(props.ref, focus.ref),
    imageRef,
    onFocus: composeHandler(focus.onFocus, props.onFocus),
    onBlur: composeHandler(focus.onBlur, props.onBlur),
  });
};
