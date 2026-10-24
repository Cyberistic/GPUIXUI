/**
 * The theme editor's pins, remembered between visits.
 *
 * The URL is the shareable half (`?theme=`); this is the half that survives a
 * reload. A store that refuses the visit is the same absence the platform
 * switch reads: the editor keeps painting, the URL keeps the choice, and the
 * next visit opens on the base style.
 */

import { guarded, type KeyValueStore } from "../../lib/browser-storage";
import { decodeState, type EditorState } from "./theme-editor-logic";

/** Where the editor's pins are remembered. */
export const themeStorageKey = "gpuixui-theme";

/** The state a store remembers, or `undefined` when it has none to give. */
export const readStoredEditorState = (
  store: KeyValueStore | undefined,
): EditorState | undefined => {
  if (store === undefined) return undefined;
  const raw = guarded(() => store.getItem(themeStorageKey));
  return raw === undefined || raw === null ? undefined : decodeState(raw);
};

/** Remember the state; a store that refuses it is a visit that forgets. */
export const writeStoredEditorState = (
  store: KeyValueStore | undefined,
  state: EditorState,
): void => {
  if (store === undefined) return;
  const raw = JSON.stringify(state);
  guarded(() => store.setItem(themeStorageKey, raw));
};

/** Forget the state; `Reset` clears the store as well as the URL. */
export const clearStoredEditorState = (
  store: KeyValueStore | undefined,
): void => {
  if (store === undefined) return;
  guarded(() => store.removeItem(themeStorageKey));
};
