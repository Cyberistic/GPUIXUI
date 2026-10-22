/**
 * The patterns page.
 *
 * A component page answers "what is a Dialog"; a reader assembling a screen asks
 * "who owns the open state, and what happens when the save fails". Those answers
 * cross components, so they live here rather than in any one page: each pattern
 * is a worked workflow with the shipped parts it uses, the page that documents
 * each part, and the failure it is designed to prevent.
 *
 * The data is authored, but every reference in it is checked against the
 * repository by `patterns.test.ts`: a part must name a page that exists and must
 * appear in that page's own text, and an example must be a file the example
 * registry publishes. A pattern cannot therefore describe a component that was
 * renamed, moved or never shipped.
 */

/** One shipped part a pattern composes, and what that part does in it. */
export interface PatternPart {
  /** The exported part or component, spelled as the page spells it. */
  readonly name: string;
  /** The page that documents it, e.g. `/docs/components/confirm-dialog`. */
  readonly url: string;
  /** Its one job inside this pattern. */
  readonly job: string;
}

/** One workflow that crosses components. */
export interface Pattern {
  /** The heading anchor the page renders it under. */
  readonly id: string;
  /** The section heading, which the page must repeat verbatim. */
  readonly title: string;
  /** When a reader reaches for this pattern, and when they should not. */
  readonly situation: string;
  readonly parts: ReadonlyArray<PatternPart>;
  /** Who owns the state the workflow runs on. */
  readonly state: string;
  /** The order the workflow runs in. */
  readonly steps: ReadonlyArray<string>;
  /** The mistake this pattern exists to prevent. */
  readonly prevents: string;
  /** A runnable example, repository-relative. */
  readonly example: string;
}

/** A reader's question, and the one component that answers it. */
export interface PatternChoice {
  readonly need: string;
  readonly use: {
    readonly name: string;
    readonly url: string;
  };
  readonly because: string;
  /** When this is the wrong answer, so the table guides rather than sells. */
  readonly not: string;
}

export const patterns: ReadonlyArray<Pattern> = [
  {
    id: "destructive-confirmation",
    title: "Confirm something irreversible",
    situation:
      "An action cannot be undone: archiving a project, deleting an account, revoking a token. The reader has already chosen it, so the dialog must repeat the consequence rather than the question.",
    parts: [
      {
        name: "ConfirmDialog",
        url: "/docs/components/confirm-dialog",
        job: "the two safety decisions: Cancel holds the focus, and confirming only reports — it never closes",
      },
      {
        name: "Dialog",
        url: "/docs/components/dialog",
        job: "the veil, Escape, focus in and the Tab trap it reuses",
      },
      {
        name: "Alert",
        url: "/docs/components/alert",
        job: "the failure that stays inside the dialog, next to the action that failed",
      },
    ],
    state:
      "Your screen owns `open` and `pending`. The dialog owns nothing but the decisions encoded in it, which is why a failed save cannot be swallowed by a close.",
    steps: [
      "Open it from the control that would perform the action, never from a menu row that performs it on the way past.",
      "Set `loading` while the work runs: both actions disable, the confirm button reads as busy, and Escape and an outside press are ignored.",
      "Close through `open` only after the work succeeded; render the failure in the dialog body so the reader retries without re-opening it.",
      "Escape and an untouched Enter both cancel, because Cancel holds the initial focus.",
    ],
    prevents:
      "An irreversible action that reports success before the work landed, or a failure the reader never sees because the dialog closed itself.",
    example: "packages/components/examples/confirm-dialog.example.tsx",
  },
  {
    id: "settings-form",
    title: "Validate a form and submit it once",
    situation:
      "A group of fields is saved together and the rules are more than 'is it empty' — an account name, an email, a slug. The screen needs one submit path, one summary of what is wrong, and a flag that stops a second submit.",
    parts: [
      {
        name: "Form",
        url: "/docs/components/form",
        job: "the schema run over a `@tanstack/form-core` state, the single alert summary and the decoded `onSubmit`",
      },
      {
        name: "Field",
        url: "/docs/components/field",
        job: "the label, the description and the message around one control",
      },
      {
        name: "Fieldset",
        url: "/docs/components/fieldset",
        job: "the group whose legend names it and whose `disabled` reaches its inputs",
      },
      {
        name: "Button",
        url: "/docs/primitives/button",
        job: "the submit control, disabled by the same pending flag",
      },
    ],
    state:
      "The screen owns the value and passes it down; `Form` drives a `@tanstack/form-core` `FormApi` for the summary and the pending guard. The core can carry field meta and register a field's validators, but it is not a second copy of the value: `Form` pushes the screen's value into it at submit and never reads one back.",
    steps: [
      "Keep the value in one place — a schema-decoded value in the screen's state — and pass it to `Form`.",
      'Decode on submit; every message appears in one `role="alert"` summary in schema order, so a failed save is announced once.',
      "Pass `pending` to `Form` and disable the submit control with the same flag; the component refuses a submit while it is set.",
      "Read `errors` from the render prop for the summary; a field that needs its own message, validator or touched state registers with the same render prop's `form` and reads `form.getFieldMeta(name)`.",
    ],
    prevents:
      "A form with two sources of truth, a submit that runs twice, and an error list that is only painted.",
    example: "packages/components/examples/form.example.tsx",
  },
  {
    id: "search-and-filter",
    title: "Search a list the reader already has",
    situation:
      "A screen holds a collection — projects, commands, files — and the reader narrows it with a query. The rows stay local; nothing is fetched.",
    parts: [
      {
        name: "SearchInput",
        url: "/docs/components/search-input",
        job: "the query, the clear control, Enter and Escape",
      },
      {
        name: "List",
        url: "/docs/components/list",
        job: "the rows, their roving tab stop and the selection",
      },
      {
        name: "EmptyState",
        url: "/docs/components/empty-state",
        job: "the zero-result panel that says which query emptied it",
      },
    ],
    state:
      "The screen owns the query and the filtered rows; the list owns the selection. Key the selection by row id, not by index, or a filter moves it to another row.",
    steps: [
      "Debounce in the caller with an Effect schedule. The field ships no timer on purpose: a component-level delay would hide the policy and break the repo's clock rule.",
      "Filter the rows the screen already holds and pass the result to `List`; it renders every row it is given, so virtualise through `<virtual-list>` before the collection gets large.",
      "Render `EmptyState` when the query matches nothing, and name the query in its description so the panel reads as a result rather than a failure.",
      "Let Escape clear a non-empty query; the field already does that and keeps a genuinely empty field alone.",
    ],
    prevents:
      "An empty list that looks like a loading failure, and a filter that silently selects a different row.",
    example: "packages/components/examples/search-input.example.tsx",
  },
  {
    id: "command-palette",
    title: "Run an action from anywhere",
    situation:
      "The reader wants an action without finding the control that owns it — jump to a file, open settings, create a record. The action set is the screen's, and the entry point is a chord.",
    parts: [
      {
        name: "CommandMenu",
        url: "/docs/components/command-menu",
        job: "the dialog, the query and the ranking inside each group",
      },
      {
        name: "Dialog",
        url: "/docs/components/dialog",
        job: "the modal surface, Escape and the focus rules the palette composes",
      },
      {
        name: "KeyboardShortcuts",
        url: "/docs/components/keyboard-shortcuts",
        job: "the keycaps a row displays; binding the chord stays the app's job",
      },
    ],
    state:
      "The screen owns `open` and the action list; the palette owns the query, the highlight and the ranking. A row's `shortcut` is display only.",
    steps: [
      "Bind the opening chord at the app level with a `Keymap` from `@gpuixui/keyboard`; the `shortcut` a row shows binds nothing.",
      "Give every action a stable id and a group. Ranking stays inside a group, so headings never repeat, and recent ids are caller-owned data.",
      "Open the palette without a field that focuses itself. The input already takes the focus; a field that grabs it during the mount leaves the modal with no opener to return it to — the failure the playground's `modal-focus-restore` probe measured.",
      "Run the highlighted action, then close. A disabled row still paints, and runs nothing.",
    ],
    prevents:
      "A documented shortcut that was never bound, and a palette that loses the reader's focus when it closes.",
    example: "packages/components/examples/command-menu.example.tsx",
  },
  {
    id: "async-feedback",
    title: "Show a save that finishes later",
    situation:
      "The work outlives the press: publishing a site, exporting a file, syncing a repository. The reader has moved on, and the result must reach them where they are.",
    parts: [
      {
        name: "Toast",
        url: "/docs/components/toast",
        job: "the queued result, its one labelled action, and the pause while hovered or focused",
      },
      {
        name: "Progress",
        url: "/docs/primitives/progress",
        job: "the fraction, when the work can report one, and a discrete step when it cannot",
      },
      {
        name: "Button",
        url: "/docs/primitives/button",
        job: "the trigger's `loading` state, which blocks a second press",
      },
    ],
    state:
      "The screen owns the work; the toast store owns the queue and the auto-dismiss timers. Both are Effect: the store is a `SubscriptionRef`, the timers a `FiberMap`.",
    steps: [
      "Disable the trigger with `loading` while the work is in flight instead of stacking a second toast.",
      "Push one toast on settle — success names what changed, failure names what to do next — and give it at most one action.",
      "Render `ToastViewport` last in the app root. There is no `zIndex` in the runtime, so paint order is the stacking.",
      "Use `Progress` only when the work can report a fraction; an indeterminate bar is the honest form of 'started, not measurable'.",
      "After the toast has gone, the failure must still be reachable somewhere persistent. A toast is a notification, not the only record of a failure.",
    ],
    prevents:
      "A save that looks instant, a second press that starts it twice, and a failure the reader never sees.",
    example: "packages/components/examples/toast.example.tsx",
  },
  {
    id: "streaming-conversation",
    title: "Follow a stream without yanking the reader",
    situation:
      "Rows arrive while the reader is looking at them — a conversation, a build log, an agent's run. New rows must appear, and the view must not move under someone reading back.",
    parts: [
      {
        name: "MessageScroller",
        url: "/docs/components/message-scroller",
        job: "the pinned follow, the unread count and the jump-to-latest affordance",
      },
      {
        name: "EmptyState",
        url: "/docs/components/empty-state",
        job: "the first-run panel before the first row arrives",
      },
    ],
    state:
      "The screen owns the rows and appends them. The scroller owns whether the reader is following the end — a decision it derives, not one the screen sets.",
    steps: [
      "Append the row and let the viewport decide: while pinned it follows, and while the reader is scrolled up their offset is untouched and the arrival is counted.",
      "Cap what a screen mounts: every row renders, because the viewport is not virtualised, so a long stream needs paging.",
      "Put the jump affordance beneath the viewport — `position: absolute` resolves against the mount parent, not the viewport.",
      "Show `EmptyState` until the first row, then hand the area to the scroller instead of drawing a skeleton that never resolves.",
    ],
    prevents:
      "A stream that scrolls itself to the bottom while the reader is reading back, and an unread count nobody can act on.",
    example: "packages/components/examples/message-scroller.example.tsx",
  },
];

export const patternChoices: ReadonlyArray<PatternChoice> = [
  {
    need: "Pick one value from a fixed list of a dozen or fewer",
    use: { name: "Select", url: "/docs/primitives/select" },
    because:
      "GPUix's published Select owns the open state, positioning and dismissal; you pass the options as data.",
    not: "when the list is long, loaded asynchronously, multiple, or needs typing — it has no type-ahead.",
  },
  {
    need: "Pick from many options, pick several, or offer a value that does not exist yet",
    use: { name: "Combobox", url: "/docs/components/combobox" },
    because:
      "The rows are ranked as the reader types, and a single-select offers one Create row when the query matches nothing.",
    not: "when the options load asynchronously or carry group headings — neither exists in v1.",
  },
  {
    need: "Run an action from anywhere in the window",
    use: { name: "CommandMenu", url: "/docs/components/command-menu" },
    because:
      "A modal palette with per-group ranking, a keyboard highlight and a search field that keeps the focus.",
    not: "for the actions on one object — that is a Dropdown menu anchored to its trigger.",
  },
  {
    need: "Act on the object under the pointer",
    use: { name: "ContextMenu", url: "/docs/components/context-menu" },
    because:
      "It opens at the pointer on a right click, and at the trigger's corner on Shift+F10.",
    not: "when the actions belong to the screen rather than the object; put them in a toolbar or a command palette.",
  },
  {
    need: "Move between the sections of a page",
    use: { name: "NavigationMenu", url: "/docs/components/navigation-menu" },
    because:
      "One anchored panel at a time, opened by hover after a delay or by press, with arrows moving between triggers.",
    not: "to show where the reader is — that is Breadcrumb, or Tabs for sibling views.",
  },
  {
    need: "Filter a long list the reader already has",
    use: { name: "SearchInput", url: "/docs/components/search-input" },
    because:
      "It is the field and nothing else: the query, the clear control, Enter and Escape. The filtering stays yours.",
    not: "when the reader chooses from ranked options — that is a Combobox, which owns the list.",
  },
];

/** The pattern a heading renders, or `undefined` when the id is not one. */
export const patternById = (id: string): Pattern | undefined =>
  patterns.find((pattern) => pattern.id === id);
