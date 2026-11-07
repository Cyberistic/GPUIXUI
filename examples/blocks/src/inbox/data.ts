export interface Thread {
  readonly id: string;
  readonly from: string;
  readonly subject: string;
  readonly preview: string;
  readonly when: string;
  readonly unread: boolean;
}

export const threads: ReadonlyArray<Thread> = [
  {
    id: "film",
    from: "Killua Zoldyck",
    subject: "Launch film, second cut",
    preview: "Every press has its own sound now…",
    when: "09:41",
    unread: true,
  },
  {
    id: "blocks",
    from: "Kurapika Kurta",
    subject: "Blocks are compiled",
    preview: "Settings, Kanban and Inbox run natively…",
    when: "09:12",
    unread: true,
  },
  {
    id: "omarchy",
    from: "Leorio Paladiknight",
    subject: "Theme follow on Omarchy",
    preview: "colors.toml changes, the app repaints…",
    when: "Yesterday",
    unread: false,
  },
  {
    id: "terminal",
    from: "Bisky Krueger",
    subject: "Terminal frames at 2x",
    preview: "The in-band resize carries pixels…",
    when: "Mon",
    unread: false,
  },
];
