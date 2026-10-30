/**
 * The window's own verbs, and the OS panel behind them.
 *
 * Everything here is a platform behaviour the app cannot paint: minimising,
 * zooming, entering fullscreen, renaming the window, and the system's path
 * picker. The runtime owns each one, so this module is the typed surface over
 * it: a hook for components, and a host-first function a test can drive without
 * a window.
 */

import { useGpuixRequired } from "@gpuix/react";
import type { PathPromptOptions } from "@gpuix/native";
import { Effect, Schema } from "effect";
import { useMemo } from "react";
import { pickedPaths, type PickedPaths } from "./logic.js";

/**
 * The window verbs, as a host must provide them.
 *
 * A renderer's methods are optional on the type (the same object serves the
 * browser and the terminal), so the hook narrows them once at setup instead of
 * letting a missing verb become a press that does nothing.
 */
export interface WindowHost {
  readonly activate: () => void;
  readonly minimize: () => void;
  readonly zoom: () => void;
  readonly toggleFullscreen: () => void;
  readonly setTitle: (title: string) => void;
  readonly pickPaths: (
    options?: PathPromptOptions,
  ) => Promise<Array<string> | null>;
}

/** A path prompt the platform refused to open. */
export class FilePanelError extends Schema.TaggedError<FilePanelError>()(
  "FilePanelError",
  {
    cause: Schema.Unknown,
  },
) {}

/** What the window can do to itself. */
export interface WindowActions extends Omit<WindowHost, "pickPaths"> {
  /**
   * Open the system's path picker.
   *
   * A cancelled prompt is `Cancelled`, not an empty list: the absence of a
   * choice is not the choice of nothing.
   */
  readonly pickPaths: (
    options?: PathPromptOptions,
  ) => Effect.Effect<PickedPaths, FilePanelError>;
}

/** The actions, bound to one host. */
export const windowActions = (host: WindowHost): WindowActions => ({
  activate: () => host.activate(),
  minimize: () => host.minimize(),
  zoom: () => host.zoom(),
  toggleFullscreen: () => host.toggleFullscreen(),
  setTitle: (title) => host.setTitle(title),
  pickPaths: (options) =>
    Effect.tryPromise({
      try: () => host.pickPaths(options),
      catch: (cause) => new FilePanelError({ cause }),
    }).pipe(Effect.map((paths): PickedPaths => pickedPaths(paths))),
});

/**
 * {@link WindowActions} for the window this component tree renders into.
 *
 * A host without the window verbs is a programming error, not a state to
 * render: the hook fails once, with the missing surface named, rather than
 * handing back buttons that do nothing.
 */
export const useWindowActions = (): WindowActions => {
  const renderer = useGpuixRequired();
  return useMemo(() => {
    const {
      activateWindow,
      minimizeWindow,
      zoomWindow,
      toggleFullscreen,
      setWindowTitle,
      promptForPaths,
    } = renderer;

    if (
      activateWindow === undefined ||
      minimizeWindow === undefined ||
      zoomWindow === undefined ||
      toggleFullscreen === undefined ||
      setWindowTitle === undefined ||
      promptForPaths === undefined
    ) {
      throw new Error(
        "useWindowActions: this renderer exposes no window verbs (activateWindow, minimizeWindow, zoomWindow, toggleFullscreen, setWindowTitle, promptForPaths)",
      );
    }

    return windowActions({
      activate: () => activateWindow(),
      minimize: () => minimizeWindow(),
      zoom: () => zoomWindow(),
      toggleFullscreen: () => toggleFullscreen(),
      setTitle: (title) => setWindowTitle(title),
      pickPaths: (options) => promptForPaths(options),
    });
  }, [renderer]);
};
