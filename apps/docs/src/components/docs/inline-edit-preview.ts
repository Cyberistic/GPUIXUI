/**
 * The inline edit preview's model: an edit that finishes once, and the app's
 * save gate around it.
 *
 * The component owns the draft and never the committed value, and its finish is
 * **one rule**: Enter or blur commits, Escape cancels, an unchanged draft calls
 * nothing, and a second Enter after the swap-out is a no-op because the real
 * control guards a repeated `submit` with `finished`. A drawing can commit twice,
 * resume an abandoned draft, or move focus to the display after a blur commit —
 * none of which is visible in a picture — so the rules live here and
 * `inline-edit-preview.test.ts` holds them to `inline-edit.tsx`.
 *
 * `nameVerdict` is the **app's** rule, not the component's: the component ships
 * an empty string as a valid value, so a form that needs a name decides that for
 * itself, and the page teaches the split.
 */

/** Where the renderer's focus is after a transition. */
export type EditFocus = "input" | "display" | "elsewhere";

/** How an edit finished: the keyboard, or the reader leaving the field. */
export type FinishReason = "enter" | "blur";

/** One rename: the committed value the caller owns, and the draft inside it. */
export interface Rename {
  /** The caller's committed text; the component never writes it by itself. */
  readonly value: string;
  /** The text inside the swap, which starts as the committed value. */
  readonly draft: string;
  readonly editing: boolean;
  /** Commits the component **reported** — a changed draft only. */
  readonly commits: number;
  /** Escapes that discarded a draft. */
  readonly discards: number;
  readonly focus: EditFocus;
}

/** A committed value, at rest, with the display holding focus on a press. */
export const renameOf = (value: string): Rename => ({
  value,
  draft: value,
  editing: false,
  commits: 0,
  discards: 0,
  focus: "display",
});

/**
 * Begin an edit: the draft is the committed value.
 *
 * An abandoned draft is never resumed, because the component copies `value` into
 * its draft on `start`; a drawing that kept the old draft would show text the
 * renderer never would.
 */
export const beginEdit = (state: Rename): Rename =>
  state.editing
    ? state
    : { ...state, editing: true, draft: state.value, focus: "input" };

/** A typed edit. Nothing leaves edit mode, and the committed value is untouched. */
export const editDraft = (state: Rename, draft: string): Rename =>
  state.editing ? { ...state, draft } : state;

/**
 * Enter, `submit` or blur: the edit finishes once.
 *
 * A changed draft is reported to the caller and becomes the display's value; an
 * unchanged one calls nothing. The second Enter 0.11.0 can deliver (`keyDown`
 * and `submit`) finds the edit already finished and changes nothing.
 *
 * Focus follows the reason: the keyboard returns it to the display, while a blur
 * commit leaves it where the reader put it — the component passes `refocus:
 * false` on `onBlur` for exactly that.
 */
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

/** Escape: discard the draft and return the focus to the display. */
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

/** What the app makes of a committed name. */
export interface NameVerdict {
  readonly ok: boolean;
  /** Why the name was refused; absent while `ok`. */
  readonly message?: string;
}

/** The longest name the demo's app accepts. */
export const nameLimit = 48;

/**
 * The demo app's save rule: a workspace needs a name, and it has to fit.
 *
 * This is deliberately **not** the component's contract — `InlineEdit` commits an
 * empty string as readily as any other value. A form gates it; a rename field in
 * a settings row may not.
 */
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
