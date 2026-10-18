/**
 * Command-menu rules that do not need a renderer: what a run records, and how
 * the recorded commands are shown before the rest of the palette.
 *
 * Recents are state, not storage. The component keeps them for its own lifetime;
 * a caller that needs them across a remount owns the `recent` prop. Keeping this
 * pure makes the ordering and the cap provable without a GPUix window.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/** One runnable command. */
export interface CommandAction {
  readonly id: string;
  readonly label: string;
  /** The heading this action sits under; consecutive actions share it. */
  readonly group?: string;
  /** Display only, e.g. `"⌘S"`. The component binds no shortcuts. */
  readonly shortcut?: string;
  /** Visible but not runnable. */
  readonly disabled?: boolean;
  readonly perform: () => void;
}

/**
 * The list after running `id`: at the front, without an older copy, at most
 * `limit` entries. Running the command already at the front returns the same
 * list, so a caller's `onRecentChange` does not fire with identical content.
 */
export const recordRecent = (
  recent: ReadonlyArray<string>,
  id: string,
  limit: number,
): ReadonlyArray<string> => {
  if (Option.exists(Arr.head(recent), (head) => head === id)) return recent;
  const capped = Math.max(1, Math.trunc(limit));
  return Arr.take(
    Arr.dedupe(
      Arr.prepend(
        Arr.filter(recent, (value) => value !== id),
        id,
      ),
    ),
    capped,
  );
};

/**
 * The rows shown for an empty query: the recent commands first, cloned under
 * `label`, then every other action in declaration order. Unknown and duplicate
 * ids are dropped, so a list that shrank between sessions still renders.
 */
export const orderWithRecent = (
  actions: ReadonlyArray<CommandAction>,
  recent: ReadonlyArray<string>,
  label: string,
): ReadonlyArray<CommandAction> => {
  const ids = Arr.dedupe(recent);
  const known = Arr.getSomes(
    Arr.map(ids, (id) => Arr.findFirst(actions, (action) => action.id === id)),
  );
  if (Arr.isReadonlyArrayEmpty(known)) return actions;

  const rest = Arr.filter(actions, (action) => !Arr.contains(ids, action.id));
  return Arr.appendAll(
    Arr.map(known, (action) => ({ ...action, group: label })),
    rest,
  );
};
