export type EditFocus = "input" | "display" | "elsewhere";

export type FinishReason = "enter" | "blur";

export interface Rename {
  readonly value: string;

  readonly draft: string;
  readonly editing: boolean;

  readonly commits: number;

  readonly discards: number;
  readonly focus: EditFocus;
}

export const renameOf = (value: string): Rename => ({
  value,
  draft: value,
  editing: false,
  commits: 0,
  discards: 0,
  focus: "display",
});

export const beginEdit = (state: Rename): Rename =>
  state.editing
    ? state
    : { ...state, editing: true, draft: state.value, focus: "input" };

export const editDraft = (state: Rename, draft: string): Rename =>
  state.editing ? { ...state, draft } : state;

export const commitEdit = (
  state: Rename,
  reason: FinishReason = "enter",
): Rename => {
  if (!state.editing) return state;
  const focus: EditFocus = reason === "blur" ? "elsewhere" : "display";
  return state.draft === state.value
    ? { ...state, editing: false, draft: state.value, focus }
    : {
        ...state,
        value: state.draft,
        editing: false,
        commits: state.commits + 1,
        focus,
      };
};

export const cancelEdit = (state: Rename): Rename =>
  state.editing
    ? {
        ...state,
        editing: false,
        draft: state.value,
        discards: state.discards + 1,
        focus: "display",
      }
    : state;

export interface NameVerdict {
  readonly ok: boolean;

  readonly message?: string;
}

export const nameLimit = 48;

export const nameVerdict = (name: string): NameVerdict => {
  if (name.trim() === "") {
    return { ok: false, message: "A workspace needs a name." };
  }
  return name.length > nameLimit
    ? {
        ok: false,
        message: `Keep the name to ${nameLimit} characters (${name.length}).`,
      }
    : { ok: true };
};
