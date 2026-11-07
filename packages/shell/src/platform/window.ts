import { useGpuixRequired } from "@gpuix/react";
import type { PathPromptOptions } from "@gpuix/native";
import { Effect, Schema } from "effect";
import { useMemo } from "react";
import { pickedPaths, type PickedPaths } from "./logic.js";

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

export class FilePanelError extends Schema.TaggedError<FilePanelError>()(
  "FilePanelError",
  {
    cause: Schema.Unknown,
  },
) {}

export interface WindowActions extends Omit<WindowHost, "pickPaths"> {
  readonly pickPaths: (
    options?: PathPromptOptions,
  ) => Effect.Effect<PickedPaths, FilePanelError>;
}

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
