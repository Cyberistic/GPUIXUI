import type { ComponentType } from "react";
import { CodeEditorExample } from "./code-editor.example.js";
import { DiffViewerExample } from "./diff-viewer.example.js";
import { MarkdownEditorExample } from "./markdown-editor.example.js";
import { SearchReplaceExample } from "./search-replace.example.js";

export const examples: Readonly<Record<string, ComponentType>> = {
  "code-editor": CodeEditorExample,
  "diff-viewer": DiffViewerExample,
  "markdown-editor": MarkdownEditorExample,
  "search-replace": SearchReplaceExample,
};
