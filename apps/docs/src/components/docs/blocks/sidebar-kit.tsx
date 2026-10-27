import type { ReactNode } from "react";

/**
 * The browser drawing shared by the sixteen sidebar blocks.
 *
 * The shipped sidebar is a GPUix tree — a width tween, an anchored sheet and a
 * modal's focus rules — so a block page cannot mount it. These are the same
 * parts and the same geometry (256px panel, 48px rail, 8px gutters, 36px rows),
 * painted in the browser and reading only the preview surface's theme roles.
 * The recipes beside each block are the `@gpuixui/*` source a reader copies.
 */

/** A glyph drawn at the library's own 24-unit box. */
export type SbIconName =
  | "arrow-down"
  | "arrow-right"
  | "arrow-up"
  | "bell"
  | "bot"
  | "calendar"
  | "check"
  | "chevron-down"
  | "chevron-right"
  | "chevrons-up-down"
  | "copy"
  | "ellipsis"
  | "error"
  | "file"
  | "file-text"
  | "folder"
  | "grid"
  | "help"
  | "home"
  | "info"
  | "link"
  | "list"
  | "lock"
  | "mail"
  | "minus"
  | "panel-left"
  | "panel-right"
  | "play"
  | "plus"
  | "search"
  | "settings"
  | "sparkles"
  | "star"
  | "table"
  | "terminal"
  | "trash"
  | "undo"
  | "upload"
  | "user"
  | "x";

const GLYPHS: Readonly<Record<SbIconName, ReactNode>> = {
  "arrow-down": <path d="M12 5v14m-7-7 7 7 7-7" />,
  "arrow-right": <path d="M5 12h14m-7-7 7 7-7 7" />,
  "arrow-up": <path d="M12 19V5m7 7-7-7-7 7" />,
  bell: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
    </>
  ),
  bot: (
    <>
      <rect height="12" rx="2" width="16" x="4" y="8" />
      <path d="M12 8V4H8M9 13v2M15 13v2" />
    </>
  ),
  calendar: (
    <>
      <rect height="18" rx="2" width="18" x="3" y="4" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  "chevron-right": <path d="m9 18 6-6-6-6" />,
  "chevrons-up-down": (
    <>
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" />
    </>
  ),
  copy: (
    <>
      <rect height="14" rx="2" width="13" x="8" y="8" />
      <path d="M4 16V4a2 2 0 0 1 2-2h10" />
    </>
  ),
  ellipsis: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </>
  ),
  file: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </>
  ),
  "file-text": (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8" />
    </>
  ),
  folder: (
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9L9.6 3.9A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  ),
  grid: (
    <>
      <rect height="7" rx="1" width="7" x="3" y="3" />
      <rect height="7" rx="1" width="7" x="14" y="3" />
      <rect height="7" rx="1" width="7" x="14" y="14" />
      <rect height="7" rx="1" width="7" x="3" y="14" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4M12 17h.01" />
    </>
  ),
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </>
  ),
  lock: (
    <>
      <rect height="11" rx="2" width="18" x="3" y="11" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  mail: (
    <>
      <rect height="14" rx="2" width="20" x="2" y="5" />
      <path d="m2 7 10 6 10-6" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  "panel-left": (
    <>
      <rect height="18" rx="2" width="18" x="3" y="3" />
      <path d="M9 3v18" />
    </>
  ),
  "panel-right": (
    <>
      <rect height="18" rx="2" width="18" x="3" y="3" />
      <path d="M15 3v18" />
    </>
  ),
  play: <path d="m7 4 13 8-13 8Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M19.1 4.9l-2.8 2.8M7.7 16.3l-2.8 2.8" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z" />
      <path d="m19 15 .7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7Z" />
    </>
  ),
  star: (
    <path d="m12 2 3 6.6 7 .7-5 4.9 1.2 7-6.2-3.2L5.8 21 7 14.2 2 9.3l7-.7Z" />
  ),
  table: (
    <>
      <rect height="18" rx="2" width="18" x="3" y="3" />
      <path d="M3 9h18M3 15h18M12 3v18" />
    </>
  ),
  terminal: (
    <>
      <path d="m4 17 6-6-6-6" />
      <path d="M12 19h8" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M8 6V4h8v2" />
      <path d="m6 6 1 15h10l1-15" />
    </>
  ),
  undo: (
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </>
  ),
  upload: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 8 5-5 5 5M12 3v12" />
    </>
  ),
  user: (
    <>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  x: <path d="M18 6 6 18M6 6l12 12" />,
};

/** One block glyph, `currentColor` at `size` pixels. */
export const SbIcon = ({
  name,
  size = 16,
}: {
  readonly name: SbIconName;
  readonly size?: number;
}) => (
  <svg
    aria-hidden="true"
    className="gx-sb-glyph"
    data-icon={name}
    fill="none"
    height={size}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
    width={size}
  >
    {GLYPHS[name]}
  </svg>
);

// ── Data ─────────────────────────────────────────────────────────────────────

export interface SbNavGroup {
  readonly label: string;
  readonly items: ReadonlyArray<string>;
}

/** The docs navigation shadcn ships across sidebar-01 … 06 and 14. */
export const DOCS_NAV: ReadonlyArray<SbNavGroup> = [
  { label: "Getting Started", items: ["Installation", "Project Structure"] },
  {
    label: "Build Your Application",
    items: [
      "Routing",
      "Data Fetching",
      "Rendering",
      "Caching",
      "Styling",
      "Optimizing",
      "Configuring",
      "Testing",
      "Authentication",
      "Deploying",
      "Upgrading",
      "Examples",
    ],
  },
  {
    label: "API Reference",
    items: [
      "Components",
      "File Conventions",
      "Functions",
      "next.config.js Options",
      "CLI",
      "Edge Runtime",
    ],
  },
  {
    label: "Architecture",
    items: [
      "Accessibility",
      "Fast Refresh",
      "Next.js Compiler",
      "Supported Browsers",
      "Turbopack",
    ],
  },
];

export const DOCS_COMMUNITY: SbNavGroup = {
  label: "Community",
  items: ["Contribution Guide"],
};

export const VERSIONS = ["1.0.1", "1.1.0-alpha", "2.0.0-beta1"] as const;

export interface SbUser {
  readonly name: string;
  readonly email: string;
  readonly initials: string;
}

export const USER: SbUser = {
  name: "Ada Lovelace",
  email: "ada@acme.com",
  initials: "AL",
};

export interface SbTeam {
  readonly name: string;
  readonly plan: string;
  readonly icon: SbIconName;
}

export const TEAMS: ReadonlyArray<SbTeam> = [
  { name: "Acme Inc", plan: "Enterprise", icon: "terminal" },
  { name: "Acme Corp.", plan: "Startup", icon: "sparkles" },
  { name: "Evil Corp.", plan: "Free", icon: "terminal" },
];

export interface SbNavItem {
  readonly label: string;
  readonly icon: SbIconName;
  readonly items: ReadonlyArray<string>;
  readonly active?: boolean;
}

export const MAIN_NAV: ReadonlyArray<SbNavItem> = [
  {
    label: "Playground",
    icon: "terminal",
    active: true,
    items: ["History", "Starred", "Settings"],
  },
  {
    label: "Models",
    icon: "bot",
    items: ["Genesis", "Explorer", "Quantum"],
  },
  {
    label: "Documentation",
    icon: "file-text",
    items: ["Introduction", "Get Started", "Tutorials", "Changelog"],
  },
  {
    label: "Settings",
    icon: "settings",
    items: ["General", "Team", "Billing", "Limits"],
  },
];

export interface SbProject {
  readonly label: string;
  readonly icon: SbIconName;
}

export const PROJECTS: ReadonlyArray<SbProject> = [
  { label: "Design Engineering", icon: "folder" },
  { label: "Sales & Marketing", icon: "table" },
  { label: "Travel", icon: "grid" },
];

export interface SbShortcut {
  readonly label: string;
  readonly icon: SbIconName;
  readonly badge?: string;
}

export const WORKSPACE_MAIN: ReadonlyArray<SbShortcut> = [
  { label: "Search", icon: "search" },
  { label: "Ask AI", icon: "sparkles" },
  { label: "Home", icon: "home" },
  { label: "Inbox", icon: "mail", badge: "10" },
];

export const WORKSPACE_SECONDARY: ReadonlyArray<SbShortcut> = [
  { label: "Calendar", icon: "calendar" },
  { label: "Settings", icon: "settings" },
  { label: "Templates", icon: "grid" },
  { label: "Trash", icon: "trash" },
  { label: "Help", icon: "help" },
];

export const APP_SECONDARY: ReadonlyArray<SbShortcut> = [
  { label: "Support", icon: "help" },
  { label: "Feedback", icon: "mail" },
];

export const FAVORITES: ReadonlyArray<{
  readonly emoji: string;
  readonly label: string;
}> = [
  { emoji: "📊", label: "Project Management & Task Tracking" },
  { emoji: "🍳", label: "Family Recipe Collection & Meal Planning" },
  { emoji: "💪", label: "Fitness Tracker & Workout Routines" },
  { emoji: "📚", label: "Book Notes & Reading List" },
  { emoji: "🌱", label: "Sustainable Gardening Tips & Plant Care" },
  { emoji: "🗣️", label: "Language Learning Progress & Resources" },
  { emoji: "🏠", label: "Home Renovation Ideas & Budget Tracker" },
  { emoji: "💰", label: "Personal Finance & Investment Portfolio" },
  { emoji: "🎬", label: "Movie & TV Show Watchlist with Reviews" },
  { emoji: "✅", label: "Daily Habit Tracker & Goal Setting" },
];

export interface SbWorkspace {
  readonly emoji: string;
  readonly label: string;
  readonly pages: ReadonlyArray<{
    readonly emoji: string;
    readonly label: string;
  }>;
}

export const WORKSPACES: ReadonlyArray<SbWorkspace> = [
  {
    emoji: "🏠",
    label: "Personal Life Management",
    pages: [
      { emoji: "📔", label: "Daily Journal & Reflection" },
      { emoji: "🍏", label: "Health & Wellness Tracker" },
      { emoji: "🌟", label: "Personal Growth & Learning Goals" },
    ],
  },
  {
    emoji: "💼",
    label: "Professional Development",
    pages: [
      { emoji: "🎯", label: "Career Objectives & Milestones" },
      { emoji: "🧠", label: "Skill Acquisition & Training Log" },
      { emoji: "🤝", label: "Networking Contacts & Events" },
    ],
  },
  {
    emoji: "🎨",
    label: "Creative Projects",
    pages: [
      { emoji: "✍️", label: "Writing Ideas & Story Outlines" },
      { emoji: "🖼️", label: "Art & Design Portfolio" },
      { emoji: "🎵", label: "Music Composition & Practice Log" },
    ],
  },
];

export const CALENDARS: ReadonlyArray<SbNavGroup> = [
  { label: "My Calendars", items: ["Personal", "Work", "Family"] },
  { label: "Favorites", items: ["Holidays", "Birthdays"] },
  { label: "Other", items: ["Travel", "Reminders", "Deadlines"] },
];

export interface SbMail {
  readonly sender: string;
  readonly subject: string;
  readonly teaser: string;
  readonly date: string;
}

export const MAIL: ReadonlyArray<SbMail> = [
  {
    sender: "William Smith",
    subject: "Meeting Tomorrow",
    teaser:
      "Hi team, just a reminder about our meeting tomorrow at 10 AM. Please come prepared with your project updates.",
    date: "09:34 AM",
  },
  {
    sender: "Alice Smith",
    subject: "Re: Project Update",
    teaser:
      "Thanks for the update. The progress looks great so far. Let's schedule a call to discuss the next steps.",
    date: "Yesterday",
  },
  {
    sender: "Bob Johnson",
    subject: "Weekend Plans",
    teaser:
      "Hey everyone! I'm thinking of organizing a team outing this weekend. Would you be interested in a hiking trip or a beach day?",
    date: "2 days ago",
  },
  {
    sender: "Emily Davis",
    subject: "Re: Question about Budget",
    teaser:
      "I've reviewed the budget numbers you sent over. Can we set up a quick call to discuss some potential adjustments?",
    date: "2 days ago",
  },
  {
    sender: "Michael Wilson",
    subject: "Important Announcement",
    teaser:
      "Please join us for an all-hands meeting this Friday at 3 PM. We have some exciting news to share.",
    date: "1 week ago",
  },
  {
    sender: "Sarah Brown",
    subject: "Re: Feedback on Proposal",
    teaser:
      "Thank you for sending over the proposal. I've reviewed it and have some thoughts — could we meet?",
    date: "1 week ago",
  },
  {
    sender: "David Lee",
    subject: "New Project Idea",
    teaser:
      "I've been brainstorming and came up with an interesting project concept. Do you have time this week?",
    date: "1 week ago",
  },
  {
    sender: "Olivia Wilson",
    subject: "Vacation Plans",
    teaser:
      "Just a heads up that I'll be taking a two-week vacation next month. All my projects are up to date.",
    date: "1 week ago",
  },
  {
    sender: "James Martin",
    subject: "Re: Conference Registration",
    teaser:
      "I've completed the registration for the upcoming tech conference. Let me know if you need anything else.",
    date: "1 week ago",
  },
  {
    sender: "Sophia White",
    subject: "Team Dinner",
    teaser:
      "To celebrate our recent project success, I'd like to organize a team dinner. Are you available next Friday?",
    date: "1 week ago",
  },
];

export const CHANGES: ReadonlyArray<{
  readonly file: string;
  readonly state: string;
}> = [
  { file: "README.md", state: "M" },
  { file: "api/hello/route.ts", state: "U" },
  { file: "app/layout.tsx", state: "M" },
];

export const SETTINGS_NAV: ReadonlyArray<{
  readonly label: string;
  readonly icon: SbIconName;
}> = [
  { label: "Notifications", icon: "bell" },
  { label: "Navigation", icon: "list" },
  { label: "Home", icon: "home" },
  { label: "Appearance", icon: "sparkles" },
  { label: "Messages & media", icon: "mail" },
  { label: "Language & region", icon: "info" },
  { label: "Accessibility", icon: "user" },
  { label: "Mark as read", icon: "check" },
  { label: "Audio & video", icon: "play" },
  { label: "Connected accounts", icon: "link" },
  { label: "Privacy & visibility", icon: "lock" },
  { label: "Advanced", icon: "settings" },
];

export const POPOVER_ACTIONS: ReadonlyArray<
  ReadonlyArray<{ readonly label: string; readonly icon: SbIconName }>
> = [
  [
    { label: "Customize Page", icon: "settings" },
    { label: "Turn into wiki", icon: "file-text" },
  ],
  [
    { label: "Copy Link", icon: "link" },
    { label: "Duplicate", icon: "copy" },
    { label: "Move to", icon: "arrow-right" },
    { label: "Move to Trash", icon: "trash" },
  ],
  [
    { label: "Undo", icon: "undo" },
    { label: "View analytics", icon: "table" },
    { label: "Version History", icon: "grid" },
    { label: "Show delete pages", icon: "trash" },
    { label: "Notifications", icon: "bell" },
  ],
  [
    { label: "Import", icon: "arrow-up" },
    { label: "Export", icon: "arrow-down" },
  ],
];

// ── Panel parts ──────────────────────────────────────────────────────────────

/** A 32px brand mark: the primary fill and its foreground. */
export const SbMark = ({ icon = "grid" }: { readonly icon?: SbIconName }) => (
  <span className="gx-sb-mark">
    <SbIcon name={icon} />
  </span>
);

/** The identity row that opens a panel: a mark, a name and a plan. */
export const SbBrand = ({
  name,
  detail,
  icon = "grid",
  chevron = true,
}: {
  readonly name: string;
  readonly detail: string;
  readonly icon?: SbIconName;
  readonly chevron?: boolean;
}) => (
  <div className="gx-sb-brand">
    <SbMark icon={icon} />
    <span className="gx-sb-brand-text">
      <span className="gx-sb-brand-name">{name}</span>
      <span className="gx-sb-brand-detail">{detail}</span>
    </span>
    {chevron ? (
      <span className="gx-sb-brand-chevron">
        <SbIcon name="chevrons-up-down" size={14} />
      </span>
    ) : null}
  </div>
);

/** The account row: avatar, name over address, and the disclosure mark. */
export const SbAccount = ({ user = USER }: { readonly user?: SbUser }) => (
  <div className="gx-sb-account">
    <span className="gx-sb-avatar">{user.initials}</span>
    <span className="gx-sb-account-text">
      <span className="gx-sb-account-name">{user.name}</span>
      <span className="gx-sb-account-mail">{user.email}</span>
    </span>
    <span className="gx-sb-account-chevron">
      <SbIcon name="chevrons-up-down" size={14} />
    </span>
  </div>
);

/** The panel's search field. */
export const SbSearch = ({
  placeholder = "Search the docs...",
}: {
  readonly placeholder?: string;
}) => (
  <div className="gx-sb-search">
    <SbIcon name="search" size={14} />
    <span className="gx-sb-search-text">{placeholder}</span>
  </div>
);

/** One labelled group. `action` paints a trailing glyph in the label row. */
export const SbGroup = ({
  label,
  trailing,
  children,
}: {
  readonly label?: string;
  readonly trailing?: ReactNode;
  readonly children: ReactNode;
}) => (
  <section className="gx-sb-group">
    {label === undefined ? null : (
      <p className="gx-sb-group-label">
        {label}
        {trailing === undefined ? null : (
          <span className="gx-sb-group-trailing">{trailing}</span>
        )}
      </p>
    )}
    <div className="gx-sb-menu">{children}</div>
  </section>
);

/** The trailing chevron a collapsible row opens with. */
export const SbChevron = ({ open = false }: { readonly open?: boolean }) => (
  <span className="gx-sb-trail gx-sb-chevron" data-open={open}>
    <SbIcon name={open ? "chevron-down" : "chevron-right"} size={13} />
  </span>
);

/** The dots a row's menu action wears. */
export const SbDots = () => (
  <span className="gx-sb-trail">
    <SbIcon name="ellipsis" size={14} />
  </span>
);

/** One row: a glyph, a label, and optional trailing content. */
export const SbRow = ({
  icon,
  label,
  active = false,
  badge,
  trailing,
  emoji,
  iconOnly = false,
}: {
  readonly icon?: SbIconName;
  readonly label?: string;
  readonly active?: boolean;
  readonly badge?: string;
  readonly trailing?: ReactNode;
  readonly emoji?: string;
  readonly iconOnly?: boolean;
}) => (
  <div
    aria-current={active ? "page" : undefined}
    className="gx-sb-row"
    data-active={active}
    data-icon-only={iconOnly}
  >
    {emoji === undefined ? null : <span className="gx-sb-emoji">{emoji}</span>}
    {icon === undefined ? null : <SbIcon name={icon} size={16} />}
    {label === undefined ? null : (
      <span className="gx-sb-row-label">{label}</span>
    )}
    {badge === undefined ? null : <span className="gx-sb-badge">{badge}</span>}
    {trailing}
  </div>
);

/** A submenu list under a row. */
export const SbSub = ({ children }: { readonly children: ReactNode }) => (
  <div className="gx-sb-sub">{children}</div>
);

/** One submenu row. */
export const SbSubRow = ({
  label,
  active = false,
}: {
  readonly label: string;
  readonly active?: boolean;
}) => (
  <div
    aria-current={active ? "page" : undefined}
    className="gx-sb-sub-row"
    data-active={active}
  >
    <span className="gx-sb-sub-label">{label}</span>
  </div>
);

/** The switch a panel header draws: the track and its knob, no interaction. */
export const SbSwitch = ({ on = false }: { readonly on?: boolean }) => (
  <span aria-checked={on} className="gx-sb-switch" data-on={on} role="switch" />
);

// ── The frame ────────────────────────────────────────────────────────────────

/**
 * The panel. `size` is the 256px default, the 48px icon rail (09's first
 * column) and the 300px list column beside it.
 */
export const SbPanel = ({
  side = "left",
  size = "default",
  rail = false,
  header,
  footer,
  children,
  className,
}: {
  readonly side?: "left" | "right";
  readonly size?: "default" | "rail" | "wide";
  readonly rail?: boolean;
  readonly header?: ReactNode;
  readonly footer?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}) => (
  <aside
    className={`gx-sb-panel gx-sb-panel--${size}${className === undefined ? "" : ` ${className}`}`}
    data-edge={side}
  >
    {header === undefined ? null : (
      <div className="gx-sb-panel-head">{header}</div>
    )}
    <div className="gx-sb-panel-body">{children}</div>
    {footer === undefined ? null : (
      <div className="gx-sb-panel-foot">{footer}</div>
    )}
    {rail ? <span aria-hidden="true" className="gx-sb-rail" /> : null}
  </aside>
);

/** The inset beside the panel, and its scroll column. */
export const SbInset = ({
  header,
  children,
}: {
  readonly header?: ReactNode;
  readonly children: ReactNode;
}) => (
  <div className="gx-sb-inset">
    {header}
    <div className="gx-sb-inset-body">{children}</div>
  </div>
);

/** The page's top bar: the toggle, a rule and the trail. */
export const SbInsetHeader = ({
  trail,
  trailing,
  border = true,
  height = 64,
  trigger = true,
  triggerIcon = "panel-left",
}: {
  readonly trail: ReadonlyArray<string>;
  readonly trailing?: ReactNode;
  readonly border?: boolean;
  readonly height?: number;
  readonly trigger?: boolean;
  readonly triggerIcon?: "panel-left" | "panel-right";
}) => (
  <header className="gx-sb-head" data-border={border} style={{ height }}>
    {trigger ? (
      <span className="gx-sb-trigger">
        <SbIcon name={triggerIcon} size={16} />
      </span>
    ) : null}
    {trigger ? <span className="gx-sb-head-rule" /> : null}
    <SbCrumbs trail={trail} />
    {trailing === undefined ? null : (
      <span className="gx-sb-head-trailing">{trailing}</span>
    )}
  </header>
);

/** The breadcrumb trail; the last entry is the current page. */
export const SbCrumbs = ({
  trail,
}: {
  readonly trail: ReadonlyArray<string>;
}) => (
  <nav aria-label="Breadcrumb" className="gx-sb-crumbs">
    {trail.map((entry, index) => (
      <span className="gx-sb-crumb" key={entry}>
        {index === 0 ? null : (
          <span aria-hidden="true" className="gx-sb-crumb-rule">
            /
          </span>
        )}
        <span
          className="gx-sb-crumb-text"
          data-page={index === trail.length - 1}
        >
          {entry}
        </span>
      </span>
    ))}
  </nav>
);

/** The frame both the panel and the inset sit in. */
export const SbShell = ({
  variant = "sidebar",
  height = "standard",
  top,
  overlay,
  children,
}: {
  readonly variant?: "sidebar" | "floating" | "inset";
  readonly height?: "standard" | "tall";
  readonly top?: ReactNode;
  /** A dropdown drawn outside the panel, where its scroller cannot clip it. */
  readonly overlay?: ReactNode;
  readonly children: ReactNode;
}) => (
  <div className="gx-sb" data-height={height} data-variant={variant}>
    {top}
    <div className="gx-sb-frame">{children}</div>
    {overlay}
  </div>
);

/** The thin strip on a panel's outer edge. */
export const SbRail = () => <span aria-hidden="true" className="gx-sb-rail" />;

// ── Inset content ────────────────────────────────────────────────────────────

const METRICS = [
  { label: "Build time", value: "1m 42s", note: "8s faster than last week" },
  { label: "Cached routes", value: "18 / 24", note: "Revalidated on publish" },
  { label: "Edge regions", value: "6", note: "All healthy" },
] as const;

const TASKS = [
  { label: "Draft the project brief", owner: "AL", done: true },
  { label: "Collect the design references", owner: "AL", done: true },
  { label: "Review the task schema", owner: "WS", done: true },
  { label: "Ship the tracking view", owner: "AL", done: false },
  { label: "Invite the workspace", owner: "WS", done: false },
] as const;

/** The three cards every block's page opens with. */
export const SbTiles = () => (
  <div className="gx-sb-tiles">
    {METRICS.map((metric) => (
      <div className="gx-sb-tile" key={metric.label}>
        <span className="gx-sb-eyebrow">{metric.label}</span>
        <strong className="gx-sb-stat">{metric.value}</strong>
        <span className="gx-sb-note">{metric.note}</span>
      </div>
    ))}
  </div>
);

/** A docs page: three summary cards over the current article. */
export const SbDocBody = () => (
  <div className="gx-sb-body">
    <SbTiles />
    <article className="gx-sb-card">
      <p className="gx-sb-eyebrow">Build your application</p>
      <h3 className="gx-sb-title">Data Fetching</h3>
      <p className="gx-sb-prose">
        Read data where it is rendered. A server component can await the store
        directly, and the shell streams to the window while the slow part of the
        page is still resolving.
      </p>
      <pre className="gx-sb-code">
        <span className="gx-sb-code-file">app/page.tsx</span>
        <code>{`export async function Page() {
  const data = await getData();
  return <View data={data} />;
}`}</code>
      </pre>
      <h4 className="gx-sb-subtitle">Caching</h4>
      <p className="gx-sb-prose">
        A route is cached until it is revalidated. Tag the read, publish the
        change, and only the routes that asked for it are rebuilt.
      </p>
    </article>
  </div>
);

/** A long docs page: every topic in its section, the page 02 scrolls through. */
export const SbLongBody = () => (
  <div className="gx-sb-body">
    <div className="gx-sb-rows">
      {DOCS_NAV.flatMap((group) =>
        group.items.map((item) => (
          <div className="gx-sb-long-row" key={`${group.label}-${item}`}>
            <span className="gx-sb-long-title">{item}</span>
            <span className="gx-sb-long-meta">{group.label}</span>
            <SbIcon name="chevron-right" size={13} />
          </div>
        )),
      )}
    </div>
  </div>
);

/** The focused workspace page: a hero over the task list. */
export const SbFocusBody = () => (
  <div className="gx-sb-body gx-sb-body--focus">
    <div className="gx-sb-hero">
      <p className="gx-sb-eyebrow">Workspace · 12 open</p>
      <h3 className="gx-sb-title">Project Management &amp; Task Tracking</h3>
      <p className="gx-sb-prose">
        One board for the brief, the design references and the release. Every
        row below is a task with an owner, and the count is the same array.
      </p>
    </div>
    <article className="gx-sb-card gx-sb-card--grow">
      <div className="gx-sb-task-head">
        <span className="gx-sb-eyebrow">This week</span>
        <span className="gx-sb-note">3 of 5 done</span>
      </div>
      {TASKS.map((task) => (
        <div className="gx-sb-task" data-done={task.done} key={task.label}>
          <span className="gx-sb-check">
            {task.done ? <SbIcon name="check" size={12} /> : null}
          </span>
          <span className="gx-sb-task-label">{task.label}</span>
          <span className="gx-sb-avatar gx-sb-avatar--sm">{task.owner}</span>
        </div>
      ))}
    </article>
  </div>
);

const DAYS = Array.from({ length: 20 }, (_, index) => index + 1);
const EVENTS: Readonly<Record<number, string>> = {
  3: "Design review",
  8: "Ship 1.0.1",
  12: "Team dinner",
  17: "Retro",
};

/** The month the calendar block paints. */
export const SbMonthBody = () => (
  <div className="gx-sb-body">
    <div className="gx-sb-month">
      <div className="gx-sb-month-head">
        <span className="gx-sb-title">October 2024</span>
        <span className="gx-sb-note">4 events</span>
      </div>
      <div className="gx-sb-week">
        {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => (
          <span className="gx-sb-weekday" key={day}>
            {day}
          </span>
        ))}
      </div>
      <div className="gx-sb-days">
        {DAYS.map((day) => (
          <div className="gx-sb-day" data-selected={day === 12} key={day}>
            <span className="gx-sb-day-number">{day}</span>
            {EVENTS[day] === undefined ? null : (
              <span className="gx-sb-event">{EVENTS[day]}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const SETTING_ROWS = [
  {
    label: "Message requests",
    note: "Let people you don't follow send one request.",
    value: "Everyone",
  },
  {
    label: "Read receipts",
    note: "Show when you have read a direct message.",
    value: "On",
  },
  {
    label: "Media quality",
    note: "Send photos at their original size.",
    value: "High",
  },
  {
    label: "Autoplay",
    note: "Play videos while the window is focused.",
    value: "Wi-Fi only",
  },
  {
    label: "Language",
    note: "The language for menus and dates.",
    value: "English (UK)",
  },
  {
    label: "Sensitive content",
    note: "Hide media that may be upsetting.",
    value: "Hidden",
  },
] as const;

/** The settings sections the dialog's content column holds. */
export const SbSettingsBody = () => (
  <div className="gx-sb-body gx-sb-body--settings">
    {SETTING_ROWS.map((row) => (
      <div className="gx-sb-setting" key={row.label}>
        <span className="gx-sb-setting-text">
          <span className="gx-sb-setting-label">{row.label}</span>
          <span className="gx-sb-note">{row.note}</span>
        </span>
        <span className="gx-sb-value">{row.value}</span>
      </div>
    ))}
  </div>
);

/** The message list the inbox inset paints. */
export const SbMailBody = () => (
  <div className="gx-sb-mail">
    {MAIL.map((mail) => (
      <div className="gx-sb-mail-row" key={mail.sender}>
        <span className="gx-sb-mail-top">
          <span className="gx-sb-mail-sender">{mail.sender}</span>
          <span className="gx-sb-note">{mail.date}</span>
        </span>
        <span className="gx-sb-mail-subject">{mail.subject}</span>
        <span className="gx-sb-mail-teaser">{mail.teaser}</span>
      </div>
    ))}
  </div>
);

// ── Shared panels ────────────────────────────────────────────────────────────

/** The workspace panel blocks 10 and 15 open with. */
export const SbWorkspacePanel = ({
  rail = true,
}: {
  readonly rail?: boolean;
}) => (
  <SbPanel
    rail={rail}
    size="default"
    header={
      <>
        <SbBrand detail="Enterprise" icon="terminal" name="Acme Inc" />
        <SbGroup>
          {WORKSPACE_MAIN.map((item) => (
            <SbRow
              active={item.label === "Home"}
              badge={item.badge}
              icon={item.icon}
              key={item.label}
              label={item.label}
            />
          ))}
        </SbGroup>
      </>
    }
  >
    <SbGroup label="Favorites">
      {FAVORITES.map((favorite) => (
        <SbRow
          emoji={favorite.emoji}
          key={favorite.label}
          label={favorite.label}
        />
      ))}
      <SbRow icon="ellipsis" label="More" />
    </SbGroup>
    <SbGroup label="Workspaces">
      {WORKSPACES.map((workspace) => (
        <SbRow
          emoji={workspace.emoji}
          key={workspace.label}
          label={workspace.label}
        />
      ))}
      <SbRow icon="ellipsis" label="More" />
    </SbGroup>
    <div className="gx-sb-push">
      <SbGroup>
        {WORKSPACE_SECONDARY.map((item) => (
          <SbRow icon={item.icon} key={item.label} label={item.label} />
        ))}
      </SbGroup>
    </div>
  </SbPanel>
);

/** The account, calendar and New Calendar column blocks 12 and 15 share. */
export const SbCalendarPanel = ({
  rail = false,
  side = "left",
  className,
}: {
  readonly rail?: boolean;
  readonly side?: "left" | "right";
  readonly className?: string;
}) => (
  <SbPanel
    className={className}
    side={side}
    header={
      <div className="gx-sb-panel-head-account">
        <SbAccount />
      </div>
    }
    rail={rail}
    footer={
      <div className="gx-sb-footer-row">
        <SbIcon name="plus" size={16} />
        <span>New Calendar</span>
      </div>
    }
  >
    <SbMonthMini />
    <span className="gx-sb-rule" />
    {CALENDARS.map((calendar) => (
      <SbGroup key={calendar.label} label={calendar.label}>
        {calendar.items.map((item, index) => (
          <SbRow
            key={item}
            label={item}
            trailing={
              <span className="gx-sb-cal-check" data-on={index < 2}>
                {index < 2 ? <SbIcon name="check" size={11} /> : null}
              </span>
            }
          />
        ))}
      </SbGroup>
    ))}
  </SbPanel>
);

/** The compact month the calendar panel opens on. */
const SbMonthMini = () => (
  <div className="gx-sb-mini">
    <div className="gx-sb-mini-head">
      <span className="gx-sb-mini-title">October 2024</span>
      <span className="gx-sb-mini-nav">
        <SbIcon name="chevron-right" size={12} />
      </span>
    </div>
    <div className="gx-sb-mini-week">
      {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
        <span className="gx-sb-mini-weekday" key={`${day}-${index}`}>
          {day}
        </span>
      ))}
    </div>
    <div className="gx-sb-mini-days">
      {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
        <span className="gx-sb-mini-day" data-selected={day === 12} key={day}>
          {day}
        </span>
      ))}
    </div>
  </div>
);

/** The app panel blocks 08 and 16 open with. */
export const SbAppPanel = () => (
  <SbPanel
    header={
      <SbBrand
        detail="Enterprise"
        icon="terminal"
        name="Acme Inc"
        chevron={false}
      />
    }
    footer={<SbAccount />}
  >
    <SbGroup label="Platform">
      {MAIN_NAV.map((item) => (
        <div className="gx-sb-item" key={item.label}>
          <SbRow
            active={item.label === "Playground"}
            icon={item.icon}
            label={item.label}
            trailing={
              item.items.length > 0 ? (
                <SbChevron open={item.active === true} />
              ) : undefined
            }
          />
          {item.active === true ? (
            <SbSub>
              {item.items.map((sub) => (
                <SbSubRow key={sub} label={sub} />
              ))}
            </SbSub>
          ) : null}
        </div>
      ))}
    </SbGroup>
    <SbGroup label="Projects">
      {PROJECTS.map((project) => (
        <SbRow
          icon={project.icon}
          key={project.label}
          label={project.label}
          trailing={<SbDots />}
        />
      ))}
      <SbRow icon="ellipsis" label="More" />
    </SbGroup>
    <div className="gx-sb-push">
      <SbGroup>
        {APP_SECONDARY.map((item) => (
          <SbRow icon={item.icon} key={item.label} label={item.label} />
        ))}
      </SbGroup>
    </div>
  </SbPanel>
);

/** The settings trail the dialog and its page share. */
export const SETTINGS_TRAIL = ["Settings", "Messages & media"] as const;
