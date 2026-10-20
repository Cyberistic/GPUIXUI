/**
 * The word a reader uses for a documented roadmap target (plan 585). The
 * roadmap promotes its **multiword** target names (plan 518), so `diff viewer`
 * and `code editor` reach the page while `diff` and `editor` fell through to a
 * limitations paragraph that happened to contain them. A single word is added
 * only where the target's own name or note contains it and no component, page
 * title or component alias already owns it.
 */
export const roadmapAliases: ReadonlyMap<string, readonly string[]> = new Map<
  string,
  readonly string[]
>([
  ["Diff viewer", ["diff"]],
  ["Code editor integration", ["editor"]],
  ["Drag and drop", ["drag", "drop"]],
  ["Rich-text editing", ["markdown", "rich text"]],
  ["Toolbars", ["toolbar"]],
  ["Virtualized lists", ["virtual list"]],
  ["Chat (AI conversation)", ["chat"]],
]);

/** Every alias term, flattening the table for the search document. */
export const roadmapAliasTerms: ReadonlyArray<string> = [
  ...roadmapAliases.values(),
].flat();
