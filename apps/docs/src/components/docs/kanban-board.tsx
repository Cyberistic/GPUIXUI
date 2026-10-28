import { Fragment, useState, type ReactNode } from "react";
import { RailToggle, useRailCollapse } from "./sidebar-rail";

/**
 * Kanban board block — a project task board with an app sidebar and four
 * columns.
 *
 * The reproduction owns the state a reader can watch: a card drags between
 * columns at the position the pointer names, the `…` menu moves it without a
 * pointer, and `+` appends a placeholder card. The counts follow the same
 * array, so a move cannot leave one stale.
 *
 * There is no kanban component in the library; this is a recipe built from
 * `Card`, `Badge`, `Avatar`, `SearchInput`, `Tabs`, `Button`, `Stack`, `Text`
 * and `Icon`.
 */

export type KanbanColumnId = "todo" | "progress" | "review" | "done";

export interface KanbanColumn {
  readonly id: KanbanColumnId;
  /** The heading, in the board's small-caps voice. */
  readonly label: string;
  /** The heading in a sentence, for menus and accessible names. */
  readonly title: string;
}

export const kanbanColumns: ReadonlyArray<KanbanColumn> = [
  { id: "todo", label: "TO DO", title: "To do" },
  { id: "progress", label: "IN PROGRESS", title: "In progress" },
  { id: "review", label: "IN REVIEW", title: "In review" },
  { id: "done", label: "DONE", title: "Done" },
];

export type KanbanPriority = "High" | "Medium" | "Low";

export interface KanbanCard {
  readonly id: string;
  readonly column: KanbanColumnId;
  readonly project: string;
  readonly priority: KanbanPriority;
  readonly title: string;
  readonly due: string;
  readonly people: ReadonlyArray<string>;
  readonly comments: number;
  readonly attachments: number;
}

export const initialKanbanCards: ReadonlyArray<KanbanCard> = [
  {
    id: "design-system",
    column: "todo",
    project: "Hologram",
    priority: "High",
    title:
      "Update the Design System to Support Dark Mode and High Contrast Themes",
    due: "Oct 24",
    people: ["DN", "AL"],
    comments: 6,
    attachments: 2,
  },
  {
    id: "wireframes",
    column: "todo",
    project: "DailyArt App",
    priority: "Low",
    title: "Sketch out initial wireframes for the main screen",
    due: "Oct 28",
    people: ["MK"],
    comments: 2,
    attachments: 0,
  },
  {
    id: "map-component",
    column: "progress",
    project: "Hologram",
    priority: "Medium",
    title: "Map Component",
    due: "Oct 26",
    people: ["JS", "RT"],
    comments: 4,
    attachments: 1,
  },
  {
    id: "micro-interactions",
    column: "progress",
    project: "Wezslo.com",
    priority: "High",
    title: "Add micro-interactions to prototype for user feedback",
    due: "Oct 30",
    people: ["DN", "MK"],
    comments: 8,
    attachments: 3,
  },
  {
    id: "color-contrast",
    column: "progress",
    project: "Starlight Team",
    priority: "Low",
    title: "Optimize color contrast for accessibility",
    due: "Nov 2",
    people: ["AL"],
    comments: 1,
    attachments: 0,
  },
  {
    id: "prototype-links",
    column: "review",
    project: "Hologram",
    priority: "Medium",
    title: "Update prototype links for usability testing",
    due: "Oct 25",
    people: ["RT", "JS"],
    comments: 3,
    attachments: 1,
  },
  {
    id: "custom-icons",
    column: "done",
    project: "DailyArt App",
    priority: "Low",
    title: "Create custom icons",
    due: "Oct 20",
    people: ["MK"],
    comments: 2,
    attachments: 4,
  },
  {
    id: "handoff",
    column: "done",
    project: "Hologram",
    priority: "Medium",
    title: "Prepare handoff files for the development team",
    due: "Oct 21",
    people: ["AL", "DN", "RT"],
    comments: 5,
    attachments: 6,
  },
];

/** How many cards each column holds. */
export const countCards = (
  cards: ReadonlyArray<KanbanCard>,
): Record<KanbanColumnId, number> =>
  cards.reduce<Record<KanbanColumnId, number>>(
    (counts, card) => ({
      ...counts,
      [card.column]: counts[card.column] + 1,
    }),
    { todo: 0, progress: 0, review: 0, done: 0 },
  );

/** The same cards with one card's column changed; every other field is kept. */
export const moveCard = (
  cards: ReadonlyArray<KanbanCard>,
  id: string,
  column: KanbanColumnId,
): ReadonlyArray<KanbanCard> =>
  cards.map((card) => (card.id === id ? { ...card, column } : card));

/**
 * The same cards with one card placed at `index` in `column`.
 *
 * A drag names a position, not only a column, so the board's order is the
 * array's: the card lands before the card currently at that index, or after the
 * column's last card when the index is past the end. A card the list does not
 * hold is a no-op, so a stale drag payload cannot drop a card that was removed
 * mid-gesture.
 */
export const moveCardTo = (
  cards: ReadonlyArray<KanbanCard>,
  id: string,
  column: KanbanColumnId,
  index: number,
): ReadonlyArray<KanbanCard> => {
  const moving = cards.find((card) => card.id === id);
  if (moving === undefined) return cards;
  const others = cards.filter((card) => card.id !== id);
  const inColumn = others.filter((card) => card.column === column);
  const next = { ...moving, column };
  const anchor = inColumn[Math.max(0, Math.min(index, inColumn.length))];
  if (anchor === undefined) {
    const last = inColumn[inColumn.length - 1];
    if (last === undefined) return [...others, next];
    const at = others.indexOf(last);
    return [...others.slice(0, at + 1), next, ...others.slice(at + 1)];
  }
  const at = others.indexOf(anchor);
  return [...others.slice(0, at), next, ...others.slice(at)];
};

/** Where a drop at `clientY` lands among the cards a stack paints. */
const dropIndex = (stack: HTMLElement, clientY: number): number => {
  const cards = [...stack.querySelectorAll<HTMLElement>("[data-card-id]")];
  return cards.filter((card) => {
    const box = card.getBoundingClientRect();
    return clientY > box.top + box.height / 2;
  }).length;
};

/** A card's next unused placeholder number, so `+` never repeats an id. */
const nextCardNumber = (cards: ReadonlyArray<KanbanCard>): number =>
  cards.reduce((highest, card) => {
    const match = /^new-(\d+)$/.exec(card.id);
    return match?.[1] === undefined
      ? highest
      : Math.max(highest, Number(match[1]));
  }, 0) + 1;

/** Appends a placeholder card to a column; the count and the menu follow it. */
export const addCard = (
  cards: ReadonlyArray<KanbanCard>,
  column: KanbanColumnId,
): ReadonlyArray<KanbanCard> => [
  ...cards,
  {
    id: `new-${nextCardNumber(cards)}`,
    column,
    project: "Hologram",
    priority: "Low",
    title: "New task",
    due: "No due date",
    people: ["DN"],
    comments: 0,
    attachments: 0,
  },
];

const ICON = {
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  work: (
    <>
      <rect height="13" rx="2" width="18" x="3" y="7" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </>
  ),
  board: (
    <>
      <rect height="16" rx="1" width="5" x="3" y="4" />
      <rect height="10" rx="1" width="5" x="10" y="4" />
      <rect height="13" rx="1" width="4" x="17" y="4" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
      <path d="M10 21h4" />
    </>
  ),
  folder: (
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-2.87 1.21V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 7.17 19.7l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  filter: <path d="M4 5h16l-6 7v6l-4 2v-8Z" />,
  ellipsis: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  message: (
    <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
  ),
  paperclip: (
    <path d="m21.4 11.6-8.9 8.9a6 6 0 0 1-8.5-8.5l9.6-9.6a4 4 0 0 1 5.7 5.7l-9.6 9.6a2 2 0 0 1-2.8-2.8l8.9-8.9" />
  ),
} as const;

type GlyphName = keyof typeof ICON;

const Glyph = ({
  children,
  size = 14,
}: {
  readonly children: ReactNode;
  readonly size?: number;
}) => (
  <svg
    aria-hidden="true"
    className="gx-kan-glyph"
    fill="none"
    height={size}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={1.8}
    viewBox="0 0 24 24"
    width={size}
  >
    {children}
  </svg>
);

const NAV_GROUPS: ReadonlyArray<{
  readonly label: string;
  readonly items: ReadonlyArray<{
    readonly label: string;
    readonly icon: GlyphName;
    readonly active: boolean;
    readonly badge?: number;
  }>;
}> = [
  {
    label: "GENERAL",
    items: [
      { label: "My Time", icon: "clock", active: false },
      { label: "My Work", icon: "work", active: false },
      { label: "Boards", icon: "board", active: false },
      { label: "Notification", icon: "bell", active: false, badge: 4 },
    ],
  },
  {
    label: "PROJECTS",
    items: [
      { label: "Hologram", icon: "folder", active: true },
      { label: "DailyArt App", icon: "folder", active: false },
      { label: "Wezslo.com", icon: "folder", active: false },
      { label: "Starlight Team", icon: "folder", active: false },
    ],
  },
  {
    label: "OTHER",
    items: [
      { label: "Settings", icon: "settings", active: false },
      { label: "Help Center", icon: "help", active: false },
    ],
  },
];

const TABS = [
  "Overview",
  "Tasks",
  "Timeline",
  "Notes",
  "Files",
  "Members",
] as const;

const MEMBERS = ["DN", "AL", "MK", "JS", "RT"] as const;

const KanbanCardView = ({
  card,
  menuOpen,
  onMenu,
  onMove,
}: {
  readonly card: KanbanCard;
  readonly menuOpen: boolean;
  readonly onMenu: () => void;
  readonly onMove: (column: KanbanColumnId) => void;
}) => (
  <article className="gx-kan-card">
    <div className="gx-kan-card-top">
      <span className="gx-kan-chip">{card.project}</span>
      <span
        className="gx-kan-chip gx-kan-priority"
        data-priority={card.priority.toLowerCase()}
      >
        {card.priority}
      </span>
      <div className="gx-kan-menu">
        <button
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={`Actions for ${card.title}`}
          className="gx-kan-more"
          onClick={onMenu}
          type="button"
        >
          <Glyph>{ICON.ellipsis}</Glyph>
        </button>
        {menuOpen ? (
          <div className="gx-kan-menu-list" role="menu">
            {kanbanColumns
              .filter((column) => column.id !== card.column)
              .map((column) => (
                <button
                  className="gx-kan-menu-item"
                  key={column.id}
                  onClick={() => onMove(column.id)}
                  role="menuitem"
                  type="button"
                >
                  Move to → {column.title}
                </button>
              ))}
          </div>
        ) : null}
      </div>
    </div>
    <p className="gx-kan-card-title">{card.title}</p>
    <p className="gx-kan-due">
      <Glyph size={12}>{ICON.clock}</Glyph>
      Due Date: {card.due}
    </p>
    <div className="gx-kan-card-foot">
      <span className="gx-kan-avatars">
        {card.people.map((person) => (
          <span className="gx-kan-avatar" key={person}>
            {person}
          </span>
        ))}
      </span>
      <span className="gx-kan-meta">
        <Glyph size={12}>{ICON.message}</Glyph>
        {card.comments}
      </span>
      <span className="gx-kan-meta">
        <Glyph size={12}>{ICON.paperclip}</Glyph>
        {card.attachments}
      </span>
    </div>
  </article>
);

export const KanbanRender = () => {
  const [cards, setCards] =
    useState<ReadonlyArray<KanbanCard>>(initialKanbanCards);
  const [menu, setMenu] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [hover, setHover] = useState<{
    readonly column: KanbanColumnId;
    readonly index: number;
  } | null>(null);
  const rail = useRailCollapse();
  const counts = countCards(cards);

  const move = (id: string, column: KanbanColumnId) => {
    setCards((current) => moveCard(current, id, column));
    setMenu(null);
  };

  return (
    <div className="gx-kan">
      <aside className="gx-kan-side" data-collapsed={rail.collapsed}>
        <div className="gx-kan-brand">
          <span aria-hidden="true" className="gx-kan-mark" />
          <span className="gx-kan-brand-name gx-rail-label">Hologram</span>
          <RailToggle
            className="gx-kan-collapse"
            collapsed={rail.collapsed}
            onToggle={rail.toggle}
          />
        </div>
        <label className="gx-kan-search gx-rail-label">
          <Glyph size={13}>{ICON.search}</Glyph>
          <input
            aria-label="Search"
            className="gx-kan-search-input"
            placeholder="Search"
            type="search"
          />
          <kbd className="gx-kan-kbd">⌘F</kbd>
        </label>
        {NAV_GROUPS.map((group) => (
          <nav
            aria-label={group.label}
            className="gx-kan-group"
            key={group.label}
          >
            <p className="gx-kan-group-label gx-rail-label">{group.label}</p>
            {group.items.map((item) => (
              <button
                aria-current={item.active ? "page" : undefined}
                aria-label={item.label}
                className="gx-kan-nav"
                data-active={item.active}
                key={item.label}
                type="button"
              >
                <Glyph size={13}>{ICON[item.icon]}</Glyph>
                <span className="gx-kan-nav-label gx-rail-label">
                  {item.label}
                </span>
                {item.badge === undefined ? null : (
                  <span className="gx-kan-count gx-rail-label">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        ))}
        <div className="gx-kan-user">
          <span className="gx-kan-user-avatar">D</span>
          <span className="gx-kan-user-text gx-rail-label">
            <span className="gx-kan-user-name">Dom</span>
            <span className="gx-kan-user-mail">dom@hologram.co</span>
          </span>
        </div>
      </aside>
      <div className="gx-kan-main">
        <header className="gx-kan-head">
          <div className="gx-kan-head-row">
            <div className="gx-kan-project">
              <span aria-hidden="true" className="gx-kan-mark" />
              <h3 className="gx-kan-project-name">Hologram</h3>
            </div>
            <div aria-label="Members" className="gx-kan-people">
              {MEMBERS.map((person) => (
                <span className="gx-kan-person" key={person}>
                  {person}
                </span>
              ))}
            </div>
            <button className="gx-btn gx-btn-primary gx-btn-sm" type="button">
              <Glyph size={12}>{ICON.plus}</Glyph>
              Add Member
            </button>
          </div>
          <div className="gx-kan-tabbar">
            <div
              aria-label="Project sections"
              className="gx-kan-tabs"
              role="tablist"
            >
              {TABS.map((tab) => (
                <button
                  aria-selected={tab === "Tasks"}
                  className="gx-kan-tab"
                  key={tab}
                  role="tab"
                  type="button"
                >
                  {tab}
                </button>
              ))}
            </div>
            <button
              className="gx-btn gx-btn-outline gx-btn-sm gx-kan-filter"
              type="button"
            >
              <Glyph size={12}>{ICON.filter}</Glyph>
              Filter
            </button>
          </div>
        </header>
        <div className="gx-kan-board">
          {kanbanColumns.map((column) => (
            <section
              aria-label={column.title}
              className="gx-kan-column"
              key={column.id}
            >
              <header className="gx-kan-column-head">
                <span
                  aria-hidden="true"
                  className="gx-kan-dot"
                  data-column={column.id}
                />
                <h4 className="gx-kan-column-title">{column.label}</h4>
                <span className="gx-kan-column-count">{counts[column.id]}</span>
                <button
                  aria-label={`Add a card to ${column.title}`}
                  className="gx-kan-plus"
                  onClick={() =>
                    setCards((current) => addCard(current, column.id))
                  }
                  type="button"
                >
                  <Glyph size={13}>{ICON.plus}</Glyph>
                </button>
              </header>
              <div
                className="gx-kan-stack"
                data-drop={hover?.column === column.id}
                onDragLeave={(event) => {
                  if (
                    !event.currentTarget.contains(
                      event.relatedTarget as Node | null,
                    )
                  ) {
                    setHover(null);
                  }
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setHover({
                    column: column.id,
                    index: dropIndex(event.currentTarget, event.clientY),
                  });
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const id =
                    event.dataTransfer.getData("text/plain") || dragging;
                  if (id !== null) {
                    const index =
                      hover?.column === column.id
                        ? hover.index
                        : Number.MAX_SAFE_INTEGER;
                    setCards((current) =>
                      moveCardTo(current, id, column.id, index),
                    );
                  }
                  setDragging(null);
                  setHover(null);
                }}
              >
                {cards
                  .filter((card) => card.column === column.id)
                  .map((card, index) => (
                    <Fragment key={card.id}>
                      {hover?.column === column.id && hover.index === index ? (
                        <div aria-hidden="true" className="gx-kan-drop-line" />
                      ) : null}
                      <div
                        className="gx-kan-drag"
                        data-card-id={card.id}
                        data-dragging={dragging === card.id}
                        draggable
                        onDragEnd={() => {
                          setDragging(null);
                          setHover(null);
                        }}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", card.id);
                          setDragging(card.id);
                        }}
                      >
                        <KanbanCardView
                          card={card}
                          menuOpen={menu === card.id}
                          onMenu={() =>
                            setMenu((current) =>
                              current === card.id ? null : card.id,
                            )
                          }
                          onMove={(target) => move(card.id, target)}
                        />
                      </div>
                    </Fragment>
                  ))}
                {hover?.column === column.id &&
                hover.index >=
                  cards.filter((card) => card.column === column.id).length ? (
                  <div aria-hidden="true" className="gx-kan-drop-line" />
                ) : null}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export const kanbanPackages: ReadonlyArray<string> = [
  "@gpuixui/primitives",
  "@gpuixui/components",
  "@gpuixui/icons",
];

export const kanbanSource = `import { Avatar } from "@gpuixui/components/avatar";
import { Badge } from "@gpuixui/components/badge";
import { Card, CardContent } from "@gpuixui/components/card";
import { SearchInput } from "@gpuixui/components/search-input";
import { Tabs, TabsList, TabsTrigger } from "@gpuixui/components/tabs";
import { Button, Stack, Text, useTheme } from "@gpuixui/primitives";
import { Icon } from "@gpuixui/icons";

const columns = ["To do", "In progress", "In review", "Done"] as const;

interface TaskCard {
  readonly id: string;
  readonly column: (typeof columns)[number];
  readonly project: string;
  readonly priority: "High" | "Medium" | "Low";
  readonly title: string;
  readonly due: string;
  readonly people: ReadonlyArray<string>;
  readonly comments: number;
  readonly attachments: number;
}

export function KanbanBoard({ cards }: { cards: ReadonlyArray<TaskCard> }) {
  const { theme } = useTheme();

  return (
    <Stack direction="row" style={{ height: 640, width: 1040 }}>
      <Stack direction="column" gap="sm" style={{ width: 230, padding: 16 }}>
        <Stack direction="row" align="center" gap="sm">
          <Icon name="sparkles" color={theme.colors.primary} />
          <Text role="title">Hologram</Text>
        </Stack>
        <SearchInput aria-label="Search" placeholder="Search" />
        <Text role="caption" tone="muted">GENERAL</Text>
        {["My Time", "My Work", "Boards", "Notification"].map((label) => (
          <Text key={label} role="label">{label}</Text>
        ))}
        <Text role="caption" tone="muted">PROJECTS</Text>
        {["Hologram", "DailyArt App", "Wezslo.com", "Starlight Team"].map((name) => (
          <Text key={name} role="label">{name}</Text>
        ))}
      </Stack>
      <Stack direction="column" grow gap="md" style={{ padding: 16 }}>
        <Stack direction="row" align="center" justify="between">
          <Text role="title">Hologram</Text>
          <Stack direction="row" align="center" gap="xs">
            {["DN", "AL", "MK", "JS", "RT"].map((name) => (
              <Avatar key={name} name={name} size="sm" />
            ))}
            <Button variant="primary" icon="plus">Add Member</Button>
          </Stack>
        </Stack>
        <Tabs defaultValue="tasks">
          <TabsList label="Project sections">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>
        </Tabs>
        <Stack direction="row" gap="md">
          {columns.map((column) => {
            const columnCards = cards.filter((card) => card.column === column);
            return (
              <Stack key={column} direction="column" grow gap="sm">
                <Stack direction="row" align="center" gap="sm">
                  <Text role="caption" tone="muted">{column}</Text>
                  <Badge variant="neutral">{columnCards.length}</Badge>
                  <Button variant="ghost" icon="plus" label={"Add to " + column} />
                </Stack>
                {columnCards.map((card) => (
                  <Card key={card.id} variant="outline">
                    <CardContent>
                      <Stack direction="row" align="center" gap="xs">
                        <Badge variant="neutral">{card.project}</Badge>
                        <Badge variant="outline">{card.priority}</Badge>
                        <Button
                          variant="ghost"
                          icon="ellipsis"
                          label={"Move " + card.title}
                        />
                      </Stack>
                      <Text role="label">{card.title}</Text>
                      <Text role="caption" tone="muted">Due Date: {card.due}</Text>
                      <Stack direction="row" align="center" gap="xs">
                        {card.people.map((person) => (
                          <Avatar key={person} name={person} size="xs" />
                        ))}
                        <Icon name="message" color={theme.colors.mutedForeground} />
                        <Text role="caption" tone="muted">{card.comments}</Text>
                        <Icon name="paperclip" color={theme.colors.mutedForeground} />
                        <Text role="caption" tone="muted">{card.attachments}</Text>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            );
          })}
        </Stack>
      </Stack>
    </Stack>
  );
}`;
