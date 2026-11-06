// The browser drawing shares the shipped board's placement rule.
import { Fragment, useState, type ReactNode } from "react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import {
  moveCardInOrder,
  resolveOrder,
} from "@gpuixui/components/kanban/logic";
import { RailToggle, useRailCollapse } from "./sidebar-rail";
import { TabStrip } from "./tab-strip";

export const KanbanColumnId = Schema.Literals([
  "open",
  "hunting",
  "review",
  "cleared",
]);

export type KanbanColumnId = typeof KanbanColumnId.Type;

export interface KanbanColumn {
  readonly id: KanbanColumnId;
  readonly label: string;
  readonly title: string;
}

export const kanbanColumns: ReadonlyArray<KanbanColumn> = [
  { id: "open", label: "OPEN", title: "Open" },
  { id: "hunting", label: "HUNTING", title: "Hunting" },
  { id: "review", label: "REVIEW", title: "Review" },
  { id: "cleared", label: "CLEARED", title: "Cleared" },
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
    id: "exam",
    column: "open",
    project: "Exam",
    priority: "High",
    title: "Survive the Fourth Phase",
    due: "Aug 31",
    people: ["GO", "KI"],
    comments: 6,
    attachments: 2,
  },
  {
    id: "ging",
    column: "open",
    project: "Search",
    priority: "Low",
    title: "Follow Ging's Tape",
    due: "Sep 04",
    people: ["GO"],
    comments: 2,
    attachments: 0,
  },
  {
    id: "troupe",
    column: "hunting",
    project: "Yorknew",
    priority: "Medium",
    title: "Track the Phantom Troupe",
    due: "Sep 01",
    people: ["KU", "LE"],
    comments: 4,
    attachments: 1,
  },
  {
    id: "whale",
    column: "hunting",
    project: "Succession",
    priority: "High",
    title: "Board the Black Whale",
    due: "Sep 06",
    people: ["KI", "KU"],
    comments: 8,
    attachments: 3,
  },
  {
    id: "eyes",
    column: "hunting",
    project: "Recovery",
    priority: "Low",
    title: "Recover the Scarlet Eyes",
    due: "Sep 09",
    people: ["KU"],
    comments: 1,
    attachments: 0,
  },
  {
    id: "zoldyck",
    column: "review",
    project: "Estate",
    priority: "Medium",
    title: "Negotiate with the Zoldycks",
    due: "Sep 02",
    people: ["KI", "GO"],
    comments: 3,
    attachments: 1,
  },
  {
    id: "greed",
    column: "cleared",
    project: "Greed Island",
    priority: "Low",
    title: "Clear Greed Island",
    due: "Aug 28",
    people: ["GO"],
    comments: 2,
    attachments: 4,
  },
  {
    id: "licence",
    column: "cleared",
    project: "Licence",
    priority: "Medium",
    title: "Earn the Hunter Licence",
    due: "Aug 29",
    people: ["LE", "GO", "KU"],
    comments: 5,
    attachments: 6,
  },
];

const orderOf = (cards: ReadonlyArray<KanbanCard>) =>
  resolveOrder(cards, kanbanColumns);

const placedColumn = (
  value: string,
  fallback: KanbanColumnId,
): KanbanColumnId => (Schema.is(KanbanColumnId)(value) ? value : fallback);

const emptyCounts = (): Record<KanbanColumnId, number> => ({
  open: 0,
  hunting: 0,
  review: 0,
  cleared: 0,
});

export const countCards = (
  cards: ReadonlyArray<KanbanCard>,
): Record<KanbanColumnId, number> =>
  Arr.reduce(cards, emptyCounts(), (counts, card) => ({
    ...counts,
    [card.column]: counts[card.column] + 1,
  }));

export const moveCard = (
  cards: ReadonlyArray<KanbanCard>,
  id: string,
  column: KanbanColumnId,
): ReadonlyArray<KanbanCard> =>
  moveCardTo(cards, id, column, Number.MAX_SAFE_INTEGER);

export const moveCardTo = (
  cards: ReadonlyArray<KanbanCard>,
  id: string,
  column: KanbanColumnId,
  index: number,
): ReadonlyArray<KanbanCard> => {
  const order = orderOf(cards);
  const moved = moveCardInOrder(order, id, column, index);
  if (moved === order) return cards;

  return Arr.flatMap(moved, (placement) =>
    Arr.flatMap(cards, (card) =>
      card.id === placement.id
        ? [{ ...card, column: placedColumn(placement.column, card.column) }]
        : [],
    ),
  );
};

const dropIndex = (stack: HTMLElement, clientY: number): number => {
  const cards = [...stack.querySelectorAll<HTMLElement>("[data-card-id]")];
  return Arr.filter(cards, (card) => {
    const box = card.getBoundingClientRect();
    return clientY > box.top + box.height / 2;
  }).length;
};

const nextCardNumber = (cards: ReadonlyArray<KanbanCard>): number =>
  Arr.reduce(cards, 0, (highest, card) => {
    const match = /^new-(\d+)$/.exec(card.id);
    return match?.[1] === undefined
      ? highest
      : Math.max(highest, Number(match[1]));
  }) + 1;

export const addCard = (
  cards: ReadonlyArray<KanbanCard>,
  column: KanbanColumnId,
): ReadonlyArray<KanbanCard> =>
  Arr.append(cards, {
    id: `new-${nextCardNumber(cards)}`,
    column,
    project: "Open",
    priority: "Low",
    title: "New hunt",
    due: "No due date",
    people: ["GO"],
    comments: 0,
    attachments: 0,
  });

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
    label: "HUNT",
    items: [
      { label: "Schedule", icon: "clock", active: false },
      { label: "Assignments", icon: "work", active: false },
      { label: "Contracts", icon: "board", active: false },
      { label: "Bounties", icon: "bell", active: false, badge: 4 },
    ],
  },
  {
    label: "EXPEDITIONS",
    items: [
      { label: "Yorknew", icon: "folder", active: true },
      { label: "Greed Island", icon: "folder", active: false },
      { label: "Dark Continent", icon: "folder", active: false },
      { label: "Zoldyck Estate", icon: "folder", active: false },
    ],
  },
  {
    label: "OTHER",
    items: [
      { label: "Settings", icon: "settings", active: false },
      { label: "Help", icon: "help", active: false },
    ],
  },
];

const TABS = [
  "Overview",
  "Hunts",
  "Timeline",
  "Notes",
  "Files",
  "Hunters",
] as const;

const MEMBERS = ["GO", "KI", "KU", "LE", "HI"] as const;

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
            {Arr.flatMap(kanbanColumns, (column) =>
              column.id === card.column
                ? []
                : [
                    <button
                      className="gx-kan-menu-item"
                      key={column.id}
                      onClick={() => onMove(column.id)}
                      role="menuitem"
                      type="button"
                    >
                      Send to → {column.title}
                    </button>,
                  ],
            )}
          </div>
        ) : null}
      </div>
    </div>
    <p className="gx-kan-card-title">{card.title}</p>
    <p className="gx-kan-due">
      <Glyph size={12}>{ICON.clock}</Glyph>
      Due: {card.due}
    </p>
    <div className="gx-kan-card-foot">
      <span className="gx-kan-avatars">
        {Arr.map(card.people, (person) => (
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
  const [view, setView] = useState<(typeof TABS)[number]>("Hunts");
  const [menu, setMenu] = useState<Option.Option<string>>(Option.none());
  const [dragging, setDragging] = useState<Option.Option<string>>(
    Option.none(),
  );
  const [hover, setHover] = useState<
    Option.Option<{
      readonly column: KanbanColumnId;
      readonly index: number;
    }>
  >(Option.none());
  const rail = useRailCollapse();
  const counts = countCards(cards);

  const move = (id: string, column: KanbanColumnId) => {
    setCards((current) => moveCard(current, id, column));
    setMenu(Option.none());
  };

  const drop = (column: KanbanColumnId, allIndex: number) => {
    Option.match(dragging, {
      onNone: () => undefined,
      onSome: (id) => {
        const inColumn = Arr.filter(cards, (card) => card.column === column);
        const from = Arr.findFirstIndex(inColumn, (card) => card.id === id);
        const index = Option.getOrElse(from, () => -1);
        setCards((current) =>
          moveCardTo(
            current,
            id,
            column,
            allIndex - (index >= 0 && allIndex > index ? 1 : 0),
          ),
        );
      },
    });
    setDragging(Option.none());
    setHover(Option.none());
  };

  return (
    <div className="gx-kan">
      <aside className="gx-kan-side" data-collapsed={rail.collapsed}>
        <div className="gx-kan-brand">
          <span className="gx-kan-brand-name gx-rail-label">HUNTERS</span>
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
        {Arr.map(NAV_GROUPS, (group) => (
          <nav
            aria-label={group.label}
            className="gx-kan-group"
            key={group.label}
          >
            <p className="gx-kan-group-label gx-rail-label">{group.label}</p>
            {Arr.map(group.items, (item) => (
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
          <span className="gx-kan-user-avatar">G</span>
          <span className="gx-kan-user-text gx-rail-label">
            <span className="gx-kan-user-name">Gon</span>
            <span className="gx-kan-user-mail">gon@hunter.assoc</span>
          </span>
        </div>
      </aside>
      <div className="gx-kan-main">
        <header className="gx-kan-head">
          <div className="gx-kan-head-row">
            <div aria-label="Hunters" className="gx-kan-people">
              {Arr.map(MEMBERS, (person) => (
                <span className="gx-kan-person" key={person}>
                  {person}
                </span>
              ))}
            </div>
            <button className="gx-btn gx-btn-primary gx-btn-sm" type="button">
              <Glyph size={12}>{ICON.plus}</Glyph>
              Add Hunter
            </button>
          </div>
          <div className="gx-kan-tabbar">
            <TabStrip
              className="gx-kan-tabs"
              label="Board sections"
              onChange={setView}
              options={Arr.map(TABS, (tab) => ({ value: tab, label: tab }))}
              tabClassName="gx-kan-tab"
              value={view}
            />
            <button
              className="gx-btn gx-btn-outline gx-btn-sm gx-kan-filter"
              type="button"
            >
              <Glyph size={12}>{ICON.filter}</Glyph>
              Filter
            </button>
          </div>
        </header>
        <div className="gx-kan-board" hidden={view !== "Hunts"}>
          {Arr.map(kanbanColumns, (column) => {
            const columnCards = Arr.filter(
              cards,
              (card) => card.column === column.id,
            );
            const hovered = Option.exists(
              hover,
              (held) => held.column === column.id,
            );
            return (
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
                  <span className="gx-kan-column-count">
                    {counts[column.id]}
                  </span>
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
                  onDragLeave={(event) => {
                    if (
                      !event.currentTarget.contains(
                        event.relatedTarget as Node | null,
                      )
                    ) {
                      setHover(Option.none());
                    }
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setHover(
                      Option.some({
                        column: column.id,
                        index: dropIndex(event.currentTarget, event.clientY),
                      }),
                    );
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const id =
                      event.dataTransfer.getData("text/plain") ||
                      Option.getOrElse(dragging, () => "");
                    if (id !== "") {
                      const index = Option.match(hover, {
                        onNone: () => columnCards.length,
                        onSome: (held) =>
                          held.column === column.id
                            ? held.index
                            : columnCards.length,
                      });
                      drop(column.id, index);
                    } else {
                      setDragging(Option.none());
                      setHover(Option.none());
                    }
                  }}
                >
                  {Arr.map(columnCards, (card, index) => (
                    <Fragment key={card.id}>
                      {hovered &&
                      Option.exists(hover, (held) => held.index === index) ? (
                        <div aria-hidden="true" className="gx-kan-drop-line" />
                      ) : null}
                      <div
                        className="gx-kan-drag"
                        data-card-id={card.id}
                        data-dragging={Option.exists(
                          dragging,
                          (held) => held === card.id,
                        )}
                        draggable
                        onDragEnd={() => {
                          setDragging(Option.none());
                          setHover(Option.none());
                        }}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", card.id);
                          setDragging(Option.some(card.id));
                        }}
                      >
                        <KanbanCardView
                          card={card}
                          menuOpen={Option.exists(
                            menu,
                            (held) => held === card.id,
                          )}
                          onMenu={() =>
                            setMenu((current) =>
                              Option.exists(current, (held) => held === card.id)
                                ? Option.none()
                                : Option.some(card.id),
                            )
                          }
                          onMove={(target) => move(card.id, target)}
                        />
                      </div>
                    </Fragment>
                  ))}
                  {hovered &&
                  Option.exists(
                    hover,
                    (held) => held.index >= columnCards.length,
                  ) ? (
                    <div aria-hidden="true" className="gx-kan-drop-line" />
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
        {view === "Hunts" ? null : (
          <p className="gx-kan-empty">Only the hunt board is drawn.</p>
        )}
      </div>
    </div>
  );
};

export const kanbanPackages: ReadonlyArray<string> = ["@gpuixui/components"];

export const kanbanSource = `import { useState } from "react";
import {
  Kanban,
  type KanbanCard,
  type KanbanColumn,
  type KanbanMove,
  type KanbanOrder,
} from "@gpuixui/components/kanban";

const columns: ReadonlyArray<KanbanColumn> = [
  { id: "open", title: "Open" },
  { id: "hunting", title: "Hunting" },
  { id: "review", title: "Review" },
  { id: "cleared", title: "Cleared" },
];

const cards: ReadonlyArray<KanbanCard> = [
  { id: "exam", column: "open", title: "Survive the Fourth Phase" },
  { id: "troupe", column: "hunting", title: "Track the Phantom Troupe" },
  { id: "greed", column: "cleared", title: "Clear Greed Island" },
];

export function HuntBoard() {
  const [order, setOrder] = useState<KanbanOrder>(
    cards.map((card) => ({ id: card.id, column: card.column })),
  );

  const move = (next: KanbanMove) => save(next);

  return (
    <Kanban
      label="Hunter contracts"
      columns={columns}
      cards={cards}
      order={order}
      onOrderChange={setOrder}
      onMove={move}
      onCardClick={(card) => open(card.id)}
    />
  );
}`;
