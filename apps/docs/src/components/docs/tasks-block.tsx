import { useState } from "react";
import * as Option from "effect/Option";
import { BlockIcon, type BlockIconName } from "./block-icons";
import { ReorderableTabs, type ReorderableTab } from "./reorderable-tabs";
import { RailToggle, useRailCollapse } from "./sidebar-rail";

/**
 * The tasks block — a Notion-style Tasks view.
 *
 * The reference is Notion's Tasks screen: a top bar over two panes, a
 * workspace sidebar, and on the right a page title, a task inbox and two rows
 * of document cards.
 *
 * The reproduction owns the state a reader can watch: a tick takes a task out
 * of the open count and every card's count follows the same array, **New
 * Task** appends to the inbox, a card's menu pins and unpins it, a section's
 * chevron folds it away, and the rail collapses to its icons.
 *
 * There is no tasks component in the library; this is a recipe built from
 * `Card`, `Badge`, `Button`, `Checkbox`, `Text`, `Stack` and `Icon`.
 */

/** One task. A task belongs to a document, or to the inbox itself. */
export interface Task {
  readonly id: string;
  /** The document the task hangs off; none for an inbox task. */
  readonly doc: Option.Option<string>;
  readonly title: string;
  /** The date shown beside the task, if it has one. */
  readonly date?: string;
  /** The date carries a folder glyph in the reference. */
  readonly folder?: boolean;
  /** The date sits at the far right of the row, not beside the text. */
  readonly trailing?: boolean;
  readonly done: boolean;
}

/** One document, and the tasks that hang off it. */
export interface TaskDoc {
  readonly id: string;
  readonly title: string;
  /** The accent the card's border and title take. */
  readonly accent: "blue" | "orange" | "yellow" | "slate" | "violet";
  /** The card's cover strip: a photo, or a tinted band. */
  readonly cover?: "photo" | "band";
  /** The cover's own tint, when it is a band. */
  readonly coverTone?: string;
  /** Whether the card is in the **Pinned Docs** row. */
  readonly pinned: boolean;
  /** The clock badge in the card's corner. */
  readonly badge?: "clock" | "pie";
}

/** The tasks the inbox starts with. */
export const initialTasks: ReadonlyArray<Task> = [
  {
    id: "replica-ball",
    doc: Option.none(),
    title: "Buy Greed Island's replica ball",
    date: "Dec 14",
    done: false,
  },
  {
    id: "leave-key",
    doc: Option.none(),
    title: "Leave keys for Gon",
    date: "Dec 10",
    done: false,
  },
  {
    id: "nen-types",
    doc: Option.none(),
    title: "Research Nen types",
    date: "Dec 14",
    folder: true,
    done: false,
  },
  {
    id: "pack",
    doc: Option.none(),
    title: "Order book about how to cook risotto for the trip",
    date: "Dec 14",
    trailing: true,
    done: false,
  },
  {
    id: "bribe",
    doc: Option.none(),
    title: "Add my trip dates to Bamboo",
    date: "Dec 14",
    done: false,
  },
  {
    id: "exam-brush-up",
    doc: Option.some("exam-prep"),
    title: "Revise Nen type theory for the exam",
    done: false,
  },
  {
    id: "exam-license",
    doc: Option.some("exam-prep"),
    title: "Get a Hunter licence before the deadline",
    done: false,
  },
  {
    id: "exam-zoldyck",
    doc: Option.some("exam-prep"),
    title: "Say goodbye to Gon before the Hunter Exam",
    done: false,
  },
  {
    id: "killua-drill",
    doc: Option.some("killua-training"),
    title: "Drill Thunderbolt on the cliffs",
    done: false,
  },
  {
    id: "killua-chain",
    doc: Option.some("killua-training"),
    title: "Chain Gunfish with the heavy chain",
    done: false,
  },
  {
    id: "kurapika-eyes",
    doc: Option.some("kurapika-eyes"),
    title: "Ask Leorio about the scarlet eyes",
    done: false,
  },
  {
    id: "kurapika-chain",
    doc: Option.some("kurapika-eyes"),
    title: "Study the chain prison's five prices",
    done: false,
  },
  {
    id: "heist-plan",
    doc: Option.some("phantom-troupe"),
    title: "Memorise the Phantom Troupe's masks",
    done: false,
  },
  {
    id: "heist-greed",
    doc: Option.some("phantom-troupe"),
    title: "Find the client who wants Greed Island",
    done: false,
  },
  {
    id: "leorio-notes",
    doc: Option.some("leorio-notes"),
    title: "Read Leorio's notes on the exams",
    done: false,
  },
  {
    id: "arena-route",
    doc: Option.some("heavensnake"),
    title: "Plan the route through Heavensnake Arena",
    done: false,
  },
  {
    id: "island-supplies",
    doc: Option.some("whale-island"),
    title: "Stock Whale Island's kitchen",
    done: false,
  },
  {
    id: "family-tree",
    doc: Option.some("zoldyck-tree"),
    title: "Fill in the Zoldyck family tree",
    done: false,
  },
  {
    id: "nen-catalogue",
    doc: Option.some("nen-catalogue"),
    title: "Catalogue the Nen types we have met",
    done: false,
  },
];

/** The documents the cards show. */
export const initialDocs: ReadonlyArray<TaskDoc> = [
  {
    id: "zoldyck-tree",
    title: "The Zoldyck family tree",
    accent: "blue",
    cover: "photo",
    pinned: true,
    badge: "clock",
  },
  {
    id: "work-things",
    title: "Work Things",
    accent: "orange",
    cover: "band",
    coverTone: "sunset",
    pinned: true,
    badge: "pie",
  },
  {
    id: "lily-schedule",
    title: "Lily's Schedule",
    accent: "blue",
    cover: "band",
    coverTone: "sky",
    pinned: true,
    badge: "clock",
  },
  {
    id: "exam-prep",
    title: "Move to the Hunter Exam 2026",
    accent: "blue",
    cover: "photo",
    pinned: false,
    badge: "clock",
  },
  {
    id: "killua-training",
    title: "Celebrating my 8th Hunter Exam",
    accent: "slate",
    cover: "band",
    coverTone: "mist",
    pinned: false,
    badge: "clock",
  },
  {
    id: "travel-planner",
    title: "Travel Planner",
    accent: "slate",
    cover: "band",
    coverTone: "mist",
    pinned: false,
    badge: "clock",
  },
  {
    id: "heavensnake",
    title: "Mon, Jun 10",
    accent: "slate",
    cover: "band",
    coverTone: "mist",
    pinned: false,
    badge: "clock",
  },
  {
    id: "phantom-troupe",
    title: "Dashboard",
    accent: "yellow",
    cover: "band",
    coverTone: "dark",
    pinned: false,
    badge: "clock",
  },
  {
    id: "greed-island",
    title: "Project: Greed Island",
    accent: "orange",
    cover: "band",
    coverTone: "sunset",
    pinned: false,
    badge: "clock",
  },
  {
    id: "whale-island",
    title: "Whale Island supplies",
    accent: "violet",
    cover: "band",
    coverTone: "sky",
    pinned: false,
    badge: "clock",
  },
  {
    id: "kurapika-eyes",
    title: "Kurapika's scarlet eyes",
    accent: "blue",
    cover: "band",
    coverTone: "sky",
    pinned: false,
    badge: "clock",
  },
  {
    id: "leorio-notes",
    title: "Leorio's medical notes",
    accent: "slate",
    cover: "band",
    coverTone: "mist",
    pinned: false,
    badge: "clock",
  },
  {
    id: "nen-catalogue",
    title: "The Nen quirk catalogue",
    accent: "orange",
    cover: "band",
    coverTone: "sunset",
    pinned: false,
    badge: "clock",
  },
];

/** The open tasks a document holds. */
export const openTasksOf = (
  tasks: ReadonlyArray<Task>,
  doc: string,
): ReadonlyArray<Task> =>
  tasks.filter((task) => Option.contains(task.doc, doc) && !task.done);

/** The task's state toggled; every other field is kept. */
export const toggleTask = (
  tasks: ReadonlyArray<Task>,
  id: string,
): ReadonlyArray<Task> =>
  tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task));

/**
 * A task appended to the inbox.
 *
 * The new task's id is the first free number, so two presses never collide
 * and a task that was removed does not take its successor's name.
 */
export const addInboxTask = (
  tasks: ReadonlyArray<Task>,
  title = "New task",
): ReadonlyArray<Task> => {
  const next =
    tasks.reduce((highest, task) => {
      const match = /^new-(\d+)$/.exec(task.id);
      return match?.[1] === undefined
        ? highest
        : Math.max(highest, Number.parseInt(match[1], 10));
    }, 0) + 1;
  return [
    ...tasks,
    { id: `new-${next}`, doc: Option.none(), title, done: false },
  ];
};

/** The same documents with one document's pinned flag changed. */
export const setPinned = (
  docs: ReadonlyArray<TaskDoc>,
  id: string,
  pinned: boolean,
): ReadonlyArray<TaskDoc> =>
  docs.map((doc) => (doc.id === id ? { ...doc, pinned } : doc));

/** The documents in the **Pinned Docs** row, and those in the row below. */
export const splitPinned = (
  docs: ReadonlyArray<TaskDoc>,
): {
  readonly pinned: ReadonlyArray<TaskDoc>;
  readonly rest: ReadonlyArray<TaskDoc>;
} => ({
  pinned: docs.filter((doc) => doc.pinned),
  rest: docs.filter((doc) => !doc.pinned),
});

const ICON = {
  panel: "columns",
  search: "search",
  bell: "bell",
  plus: "plus",
  home: "grid",
  document: "file",
  box: "archive",
  tasks: "badgeCheck",
  calendar: "clock",
  star: "star",
  layers: "list",
  template: "card",
  globe: "eye",
  folder: "folder",
  feedback: "mail",
  help: "sparkles",
  chevron: "chevronDown",
  more: "more",
  clock: "clock",
  pie: "chart",
  note: "file",
} as const satisfies Readonly<Record<string, BlockIconName>>;

/** The block's own icon names, each mapped to the glyph it draws. */
type GlyphName = keyof typeof ICON;

const Glyph = ({
  name,
  size = 14,
}: {
  readonly name: GlyphName;
  readonly size?: number;
}) => <BlockIcon name={ICON[name]} size={size} />;

/** The sidebar's rows, in the reference's order. */
interface SidebarItem {
  readonly label: string;
  readonly icon: GlyphName;
  readonly active?: boolean;
  /** The row's trailing control: a `+`, a focus glyph or a chevron. */
  readonly trailing?: "plus" | "focus" | "chevron";
}

const SIDEBAR_TOP: ReadonlyArray<SidebarItem> = [
  { label: "Home", icon: "home" },
  { label: "New Document", icon: "document" },
];

const SIDEBAR_MAIN: ReadonlyArray<SidebarItem> = [
  { label: "Organize", icon: "document" },
  { label: "All Docs", icon: "box" },
  { label: "Tasks", icon: "tasks", active: true, trailing: "plus" },
  { label: "Calendar", icon: "calendar", trailing: "focus" },
  { label: "Starred", icon: "star" },
  { label: "Unsorted", icon: "layers" },
  { label: "My Templates", icon: "template" },
  { label: "Published Content", icon: "globe" },
];

const SIDEBAR_FOLDERS: ReadonlyArray<SidebarItem> = [
  { label: "Work related", icon: "folder" },
  { label: "Journal", icon: "folder", trailing: "chevron" },
  { label: "Lily", icon: "star", trailing: "chevron" },
  { label: "Less is More", icon: "folder", trailing: "chevron" },
];

const SIDEBAR_FOOT: ReadonlyArray<SidebarItem> = [
  { label: "Send Beta Feedback", icon: "feedback" },
  { label: "Help Center", icon: "help" },
];

/**
 * One checkbox.
 *
 * The browser preview draws the library's own box: the drawing is a child that
 * takes no pointer input, so a press anywhere in the target activates once.
 * Space is held until the key is released, as the native box does.
 */
const TaskCheck = ({
  label,
  checked,
  onToggle,
}: {
  readonly label: string;
  readonly checked: boolean;
  readonly onToggle: () => void;
}) => (
  <span
    aria-checked={checked}
    aria-label={label}
    className="gx-task-check"
    data-state={checked ? "checked" : "unchecked"}
    onClick={onToggle}
    onKeyDown={(event) => {
      if (event.key === " ") event.preventDefault();
    }}
    onKeyUp={(event) => {
      if (event.key === " ") {
        event.preventDefault();
        onToggle();
      }
    }}
    role="checkbox"
    tabIndex={0}
  >
    <span aria-hidden="true" className="gx-task-check-box">
      {checked ? "✓" : null}
    </span>
  </span>
);

/** The date pill beside an inbox task. */
const DatePill = ({ task }: { readonly task: Task }) => (
  <span className="gx-task-date" data-folder={task.folder || undefined}>
    {task.folder ? <Glyph name="folder" size={11} /> : null}
    {task.date}
  </span>
);

/** One task row in the inbox. */
const InboxRow = ({
  task,
  onToggle,
}: {
  readonly task: Task;
  readonly onToggle: () => void;
}) => (
  <li className="gx-task-row" data-done={task.done || undefined}>
    <TaskCheck checked={task.done} label={task.title} onToggle={onToggle} />
    {task.trailing ? (
      <>
        <span className="gx-task-row-text">{task.title}</span>
        {task.date === undefined ? null : <DatePill task={task} />}
      </>
    ) : (
      <>
        {task.date === undefined ? null : <DatePill task={task} />}
        <span className="gx-task-row-text">{task.title}</span>
      </>
    )}
  </li>
);

/** The card's count line, in the reference's voice. */
const countLabel = (count: number): string =>
  count === 1 ? "1 task to do" : `${count} tasks to do`;

/** The page a document tab opens: its cover, its count and every task. */
const DocView = ({
  doc,
  tasks,
  onToggle,
}: {
  readonly doc: TaskDoc;
  readonly tasks: ReadonlyArray<Task>;
  readonly onToggle: (id: string) => void;
}) => {
  const all = tasks.filter((task) => Option.contains(task.doc, doc.id));
  const open = all.filter((task) => !task.done);
  return (
    <div className="gx-task-doc" data-accent={doc.accent}>
      <div
        className="gx-task-doc-cover"
        data-cover={doc.cover ?? "band"}
        data-tone={doc.coverTone}
      />
      <h2 className="gx-task-doc-title">{doc.title}</h2>
      <p className="gx-task-doc-count">{countLabel(open.length)}</p>
      <ul className="gx-task-doc-list">
        {all.map((task) => (
          <li data-done={task.done || undefined} key={task.id}>
            <TaskCheck
              checked={task.done}
              label={task.title}
              onToggle={() => onToggle(task.id)}
            />
            <span>{task.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** One document card. */
const DocCard = ({
  doc,
  tasks,
  menuOpen,
  onMenu,
  onOpen,
  onPin,
  onToggle,
}: {
  readonly doc: TaskDoc;
  readonly tasks: ReadonlyArray<Task>;
  readonly menuOpen: boolean;
  readonly onMenu: () => void;
  readonly onOpen: () => void;
  readonly onPin: () => void;
  readonly onToggle: (id: string) => void;
}) => {
  const open = openTasksOf(tasks, doc.id);
  return (
    <article className="gx-task-card" data-accent={doc.accent}>
      <div
        className="gx-task-card-cover"
        data-cover={doc.cover ?? "band"}
        data-tone={doc.coverTone}
      >
        {doc.badge === undefined ? null : (
          <span aria-hidden="true" className="gx-task-card-badge">
            <Glyph name={doc.badge} size={13} />
          </span>
        )}
      </div>
      <div className="gx-task-card-body">
        <div className="gx-task-card-head">
          <span aria-hidden="true" className="gx-task-card-glyph">
            <Glyph name="note" size={13} />
          </span>
          <button className="gx-task-card-title" onClick={onOpen} type="button">
            {doc.title}
          </button>
          <span className="gx-task-card-menu">
            <button
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label={`Actions for ${doc.title}`}
              className="gx-task-more"
              onClick={onMenu}
              type="button"
            >
              <Glyph name="more" size={13} />
            </button>
            {menuOpen ? (
              <div className="gx-task-menu-list" role="menu">
                <button
                  className="gx-task-menu-item"
                  onClick={onPin}
                  role="menuitem"
                  type="button"
                >
                  {doc.pinned ? "Unpin from Pinned Docs" : "Pin to Pinned Docs"}
                </button>
              </div>
            ) : null}
          </span>
        </div>
        <p className="gx-task-card-count">{countLabel(open.length)}</p>
        <ul className="gx-task-card-list">
          {open.map((task) => (
            <li key={task.id}>
              <TaskCheck
                checked={task.done}
                label={task.title}
                onToggle={() => onToggle(task.id)}
              />
              <span className="gx-task-card-task">{task.title}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
};

/** A section header: the title, the `···` and the far-right chevron. */
const SectionHead = ({
  title,
  collapsed,
  onToggle,
}: {
  readonly title: string;
  readonly collapsed: boolean;
  readonly onToggle: () => void;
}) => (
  <header className="gx-task-section-head">
    <h3 className="gx-task-section-title">{title}</h3>
    <button
      aria-label={`More actions for ${title}`}
      className="gx-task-section-more"
      type="button"
    >
      <Glyph name="more" size={14} />
    </button>
    <button
      aria-expanded={!collapsed}
      aria-label={`${collapsed ? "Expand" : "Collapse"} ${title}`}
      className="gx-task-section-chevron"
      onClick={onToggle}
      type="button"
    >
      <Glyph name="chevron" size={14} />
    </button>
  </header>
);

/** The page's own tab: the Tasks view itself. */
const TASKS_TAB = "tasks";

const TASKS_HOME_TAB: ReorderableTab = {
  id: TASKS_TAB,
  label: "Tasks",
  leading: <Glyph name="tasks" size={13} />,
};

export const TasksRender = () => {
  const [tasks, setTasks] = useState<ReadonlyArray<Task>>(initialTasks);
  const [docs, setDocs] = useState<ReadonlyArray<TaskDoc>>(initialDocs);
  const [menu, setMenu] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<ReadonlyArray<string>>([]);
  const [openTabs, setOpenTabs] = useState<ReadonlyArray<ReorderableTab>>([
    TASKS_HOME_TAB,
  ]);
  const [activeTab, setActiveTab] = useState<string>(TASKS_TAB);
  const rail = useRailCollapse();
  const { pinned, rest } = splitPinned(docs);
  const activeDoc = docs.find((doc) => doc.id === activeTab);

  /** A document opened as its own tab, or the existing tab brought forward. */
  const openDoc = (doc: TaskDoc): void => {
    setOpenTabs((current) =>
      current.some((tab) => tab.id === doc.id)
        ? current
        : [...current, { id: doc.id, label: doc.title }],
    );
    setActiveTab(doc.id);
  };

  /** `+` opens a blank view, which the reader can close again. */
  const addTab = (): void => {
    const id = `new-${openTabs.length + 1}`;
    setOpenTabs((current) => [
      ...current,
      { id, label: `Untitled ${current.length}` },
    ]);
    setActiveTab(id);
  };

  /** A closed tab hands the pane to its neighbour, or back to the page. */
  const closeTab = (id: string): void => {
    setOpenTabs((current) => {
      const index = current.findIndex((tab) => tab.id === id);
      const next = current.filter((tab) => tab.id !== id);
      if (activeTab === id) {
        const neighbour = next[Math.min(index, next.length - 1)];
        setActiveTab(neighbour?.id ?? TASKS_TAB);
      }
      return next.length === 0 ? [TASKS_HOME_TAB] : next;
    });
  };

  const toggle = (id: string): void =>
    setTasks((current) => toggleTask(current, id));

  const fold = (section: string): void =>
    setCollapsed((current) =>
      current.includes(section)
        ? current.filter((name) => name !== section)
        : [...current, section],
    );

  return (
    <div className="gx-task">
      <header className="gx-task-bar">
        <span className="gx-task-bar-left">
          <button
            aria-label="Toggle sidebar"
            className="gx-task-bar-btn"
            type="button"
          >
            <Glyph name="panel" size={15} />
          </button>
          <button
            aria-label="Collapse sidebar"
            className="gx-task-bar-btn"
            onClick={rail.toggle}
            type="button"
          >
            <Glyph name="chevron" size={15} />
          </button>
          <span className="gx-task-bar-arrows">
            <button aria-label="Back" className="gx-task-bar-btn" type="button">
              ‹
            </button>
            <button
              aria-label="Forward"
              className="gx-task-bar-btn"
              type="button"
            >
              ›
            </button>
          </span>
        </span>
        <ReorderableTabs
          active={activeTab}
          className="gx-task-tabs"
          label="Open views"
          onActivate={setActiveTab}
          onClose={closeTab}
          onReorder={setOpenTabs}
          tabClassName="gx-task-tab"
          tabs={openTabs}
        />
        <button
          aria-label="New tab"
          className="gx-task-bar-btn"
          onClick={addTab}
          type="button"
        >
          <Glyph name="plus" size={15} />
        </button>
        <span className="gx-task-bar-right">
          <button
            aria-label="Notifications"
            className="gx-task-bar-btn"
            type="button"
          >
            <Glyph name="bell" size={15} />
          </button>
          <span aria-hidden="true" className="gx-task-avatar">
            <Glyph name="star" size={13} />
          </span>
        </span>
      </header>

      <div className="gx-task-body">
        <aside className="gx-task-side" data-collapsed={rail.collapsed}>
          <nav className="gx-task-nav">
            {SIDEBAR_TOP.map((item) => (
              <button
                className="gx-task-nav-row"
                key={item.label}
                type="button"
              >
                <Glyph name={item.icon} size={15} />
                <span className="gx-task-nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="gx-task-workspace">
            <span aria-hidden="true" className="gx-task-workspace-avatar">
              <Glyph name="star" size={13} />
            </span>
            <span className="gx-task-nav-label">Whale Island</span>
            <span aria-hidden="true" className="gx-task-workspace-chevron">
              ⌄
            </span>
            <button
              aria-label="Search the workspace"
              className="gx-task-bar-btn gx-task-workspace-search"
              type="button"
            >
              <Glyph name="search" size={15} />
            </button>
          </div>
          <nav className="gx-task-nav">
            {SIDEBAR_MAIN.map((item) => (
              <button
                aria-current={item.active ? "page" : undefined}
                className="gx-task-nav-row"
                data-active={item.active || undefined}
                key={item.label}
                type="button"
              >
                <Glyph name={item.icon} size={15} />
                <span className="gx-task-nav-label">{item.label}</span>
                {item.trailing === "plus" ? (
                  <span className="gx-task-nav-trailing">
                    <Glyph name="plus" size={13} />
                  </span>
                ) : null}
                {item.trailing === "focus" ? (
                  <span className="gx-task-nav-trailing">
                    <Glyph name="search" size={13} />
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
          <div className="gx-task-folders-head">
            <span className="gx-task-nav-label">Folders</span>
            <button
              aria-label="Add a folder"
              className="gx-task-bar-btn"
              type="button"
            >
              <Glyph name="plus" size={14} />
            </button>
          </div>
          <nav className="gx-task-nav">
            {SIDEBAR_FOLDERS.map((item) => (
              <button
                className="gx-task-nav-row"
                key={item.label}
                type="button"
              >
                <Glyph name={item.icon} size={15} />
                <span className="gx-task-nav-label">{item.label}</span>
                {item.trailing === "chevron" ? (
                  <span className="gx-task-nav-trailing">›</span>
                ) : null}
              </button>
            ))}
          </nav>
          <nav className="gx-task-nav gx-task-foot">
            {SIDEBAR_FOOT.map((item) => (
              <button
                className="gx-task-nav-row"
                key={item.label}
                type="button"
              >
                <Glyph name={item.icon} size={15} />
                <span className="gx-task-nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
          <RailToggle
            className="gx-task-collapse"
            collapsed={rail.collapsed}
            onToggle={rail.toggle}
          />
        </aside>

        <main className="gx-task-main">
          {activeDoc === undefined ? (
            <>
              <div className="gx-task-page-head">
                <h2 className="gx-task-page-title">Tasks</h2>
                <button
                  className="gx-task-new"
                  onClick={() => setTasks((current) => addInboxTask(current))}
                  type="button"
                >
                  <Glyph name="plus" size={14} />
                  New Task
                </button>
              </div>

              <section className="gx-task-section">
                <SectionHead
                  collapsed={collapsed.includes("inbox")}
                  onToggle={() => fold("inbox")}
                  title="Inbox"
                />
                {collapsed.includes("inbox") ? null : (
                  <ul className="gx-task-inbox">
                    {tasks
                      .filter((task) => Option.isNone(task.doc))
                      .map((task) => (
                        <InboxRow
                          key={task.id}
                          onToggle={() => toggle(task.id)}
                          task={task}
                        />
                      ))}
                  </ul>
                )}
              </section>

              <section className="gx-task-section">
                <SectionHead
                  collapsed={collapsed.includes("pinned")}
                  onToggle={() => fold("pinned")}
                  title="Pinned Docs"
                />
                {collapsed.includes("pinned") ? null : (
                  <div className="gx-task-cards">
                    {pinned.map((doc) => (
                      <DocCard
                        doc={doc}
                        key={doc.id}
                        menuOpen={menu === doc.id}
                        onOpen={() => openDoc(doc)}
                        onMenu={() =>
                          setMenu((current) =>
                            current === doc.id ? null : doc.id,
                          )
                        }
                        onPin={() => {
                          setDocs((current) =>
                            setPinned(current, doc.id, !doc.pinned),
                          );
                          setMenu(null);
                        }}
                        onToggle={toggle}
                        tasks={tasks}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section className="gx-task-section">
                <SectionHead
                  collapsed={collapsed.includes("docs")}
                  onToggle={() => fold("docs")}
                  title="Docs With Tasks"
                />
                {collapsed.includes("docs") ? null : (
                  <div className="gx-task-cards">
                    {rest.map((doc) => (
                      <DocCard
                        doc={doc}
                        key={doc.id}
                        menuOpen={menu === doc.id}
                        onOpen={() => openDoc(doc)}
                        onMenu={() =>
                          setMenu((current) =>
                            current === doc.id ? null : doc.id,
                          )
                        }
                        onPin={() => {
                          setDocs((current) =>
                            setPinned(current, doc.id, !doc.pinned),
                          );
                          setMenu(null);
                        }}
                        onToggle={toggle}
                        tasks={tasks}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : (
            <DocView doc={activeDoc} onToggle={toggle} tasks={tasks} />
          )}
        </main>
      </div>
    </div>
  );
};

export const tasksPackages: ReadonlyArray<string> = [
  "@gpuixui/primitives",
  "@gpuixui/components",
  "@gpuixui/icons",
];

export const tasksSource = `import { Card, CardContent } from "@gpuixui/components/card";
import { Checkbox } from "@gpuixui/primitives";
import { Button, Stack, Text } from "@gpuixui/primitives";
import { Icon } from "@gpuixui/icons";
import { useState } from "react";

interface Task {
  readonly id: string;
  readonly doc: string | null;
  readonly title: string;
  readonly done: boolean;
}

interface TaskDoc {
  readonly id: string;
  readonly title: string;
  readonly pinned: boolean;
}

const initialTasks: ReadonlyArray<Task> = [
  { id: "replica-ball", doc: null, title: "Buy Greed Island's replica ball", done: false },
  { id: "leave-key", doc: null, title: "Leave keys for Gon", done: false },
  { id: "nen-types", doc: null, title: "Research Nen types", done: false },
  { id: "exam-brush-up", doc: "exam-prep", title: "Revise Nen type theory for the exam", done: false },
];

const initialDocs: ReadonlyArray<TaskDoc> = [
  { id: "zoldyck-tree", title: "The Zoldyck family tree", pinned: true },
  { id: "exam-prep", title: "Move to the Hunter Exam 2026", pinned: false },
];

const openTasksOf = (tasks: ReadonlyArray<Task>, doc: string) =>
  tasks.filter((task) => task.doc === doc && !task.done);

const toggleTask = (tasks: ReadonlyArray<Task>, id: string) =>
  tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task));

const setPinned = (docs: ReadonlyArray<TaskDoc>, id: string, pinned: boolean) =>
  docs.map((doc) => (doc.id === id ? { ...doc, pinned } : doc));

export function TasksView() {
  const [tasks, setTasks] = useState(initialTasks);
  const [docs, setDocs] = useState(initialDocs);

  const toggle = (id: string) =>
    setTasks((current) => toggleTask(current, id));

  return (
    <Stack direction="row" style={{ height: 640, width: 1040 }}>
      <Stack direction="column" gap="sm" style={{ width: 230, padding: 16 }}>
        <Text role="title">Whale Island</Text>
        {["Home", "New Document", "Organize", "All Docs", "Tasks", "Calendar"].map(
          (label) => (
            <Text key={label} role="label">{label}</Text>
          ),
        )}
      </Stack>
      <Stack direction="column" grow gap="md" style={{ padding: 16 }}>
        <Stack direction="row" align="center" justify="between">
          <Text role="title">Tasks</Text>
          <Button variant="primary" icon="plus">New Task</Button>
        </Stack>
        {tasks
          .filter((task) => task.doc === null)
          .map((task) => (
            <Stack key={task.id} direction="row" align="center" gap="sm">
              <Checkbox
                checked={task.done}
                label={task.title}
                onCheckedChange={() => toggle(task.id)}
              />
              <Text role="label">{task.title}</Text>
            </Stack>
          ))}
        {docs.map((doc) => (
          <Card key={doc.id} variant="outline">
            <CardContent>
              <Text role="label">{doc.title}</Text>
              <Text role="caption" tone="muted">
                {openTasksOf(tasks, doc.id).length} tasks to do
              </Text>
              {openTasksOf(tasks, doc.id).map((task) => (
                <Checkbox
                  checked={task.done}
                  key={task.id}
                  label={task.title}
                  onCheckedChange={() => toggle(task.id)}
                />
              ))}
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}`;
