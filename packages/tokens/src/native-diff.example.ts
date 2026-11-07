import { nativeTextTheme, type Theme } from "./index.js";

export const diffHostTheme = (theme: Theme) => {
  const host = nativeTextTheme(theme, "background");
  return {
    host,

    hunk: { backgroundColor: host.diffHunkBg, color: host.textFaint },

    filePath: { color: host.textDim },

    counts: {
      added: { color: host.diffAdd },
      removed: { color: host.diffDel },
    },
  };
};
