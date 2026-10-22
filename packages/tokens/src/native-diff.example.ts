import { nativeTextTheme, type Theme } from "./index.js";

/**
 * The theme object a `<diff>` host takes, and the two surfaces it paints from
 * one value.
 *
 * A diff row's ink and the wash under it are the same field: the runtime tints
 * the row 5.5% of the line's own colour over the fill, so a component cannot
 * choose a soft tint and a readable ink separately. This example is the shape a
 * consumer spreads onto the host, plus the strip colours a caller can read to
 * paint its own file list or gutter.
 */
export const diffHostTheme = (theme: Theme) => {
  const host = nativeTextTheme(theme, "background");
  return {
    /** The object to hand the host, on the fill the diff sits on. */
    host,
    /** A hunk header's stripe and the chrome text inside it. */
    hunk: { backgroundColor: host.diffHunkBg, color: host.textFaint },
    /** A file header's path, in the dim chrome role. */
    filePath: { color: host.textDim },
    /** A changed line's counts, in the tone's readable role. */
    counts: {
      added: { color: host.diffAdd },
      removed: { color: host.diffDel },
    },
  };
};
