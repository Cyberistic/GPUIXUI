/**
 * The package's public surface: one line per part.
 *
 * Each part exports its component, its prop types and its inventory record.
 * The pure logic — the line diff, the find-and-replace matcher — is exported
 * from its subpath so a test or a consumer can use the decision without the
 * renderer.
 */

export * from "./code-editor/code-editor.js";
export * from "./code-editor/highlight.js";
export * from "./code-editor/logic.js";
export * from "./diff/diff-viewer.js";
export * from "./search/search-replace.js";
