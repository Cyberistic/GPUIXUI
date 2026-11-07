import { guarded, type KeyValueStore } from "../../lib/browser-storage";
import { decodeState, type EditorState } from "./theme-editor-logic";

export const themeStorageKey = "gpuixui-theme";

export const readStoredEditorState = (
  store: KeyValueStore | undefined,
): EditorState | undefined => {
  if (store === undefined) return undefined;
  const raw = guarded(() => store.getItem(themeStorageKey));
  return raw === undefined || raw === null ? undefined : decodeState(raw);
};

export const writeStoredEditorState = (
  store: KeyValueStore | undefined,
  state: EditorState,
): void => {
  if (store === undefined) return;
  const raw = JSON.stringify(state);
  guarded(() => store.setItem(themeStorageKey, raw));
};

export const clearStoredEditorState = (
  store: KeyValueStore | undefined,
): void => {
  if (store === undefined) return;
  guarded(() => store.removeItem(themeStorageKey));
};
