/**
 * Behaviour suites whose component is proven in both themes by the shared
 * matrix in `theme-matrix.test.tsx`, not by its own file.
 *
 * `inventory.test.ts` holds this list to the suites on disk: a component whose
 * own suite never mentions `lightTheme` must be here, and a suite that starts
 * proving both themes itself must leave (plan 528).
 */
export const themeMatrixCoverage: ReadonlyArray<string> = [
  "src/behaviour/accordion.test.tsx",
  "src/behaviour/avatar.test.tsx",
  "src/behaviour/breadcrumb.test.tsx",
  "src/behaviour/carousel.test.tsx",
  "src/behaviour/chat.test.tsx",
  "src/behaviour/collapsible.test.tsx",
  "src/behaviour/command-menu.test.tsx",
  "src/behaviour/confirm-dialog.test.tsx",
  "src/behaviour/context-menu.test.tsx",
  "src/behaviour/countdown.test.tsx",
  "src/behaviour/empty-state.test.tsx",
  "src/behaviour/inline-edit.test.tsx",
  "src/behaviour/list.test.tsx",
  "src/behaviour/mention-input.test.tsx",
  "src/behaviour/message-scroller.test.tsx",
  "src/behaviour/message.test.tsx",
  "src/behaviour/preview-card.test.tsx",
  "src/behaviour/search-input.test.tsx",
  "src/behaviour/tag-input.test.tsx",
  "src/behaviour/time-picker.test.tsx",
];
