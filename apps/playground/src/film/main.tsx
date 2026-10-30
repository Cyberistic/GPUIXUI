/**
 * The launch film's demo apps: three small, self-driving native windows.
 *
 * Each one is a real GPUix tree, rendered by the same `render()` the playground
 * uses, and each drives its own state on a timer so a screen recording shows
 * the interface moving without a synthetic pointer. They exist only for the
 * film (`media/launch`); nothing here is a shipped surface.
 *
 *   nub apps/playground/dist/film/main.js files
 *   nub apps/playground/dist/film/main.js tasks
 *   nub apps/playground/dist/film/main.js palette
 */
import {
  createRenderer,
  createRoot,
  render,
  startFrameLoop,
  type StyleDesc,
} from "@gpuix/react";
import { darkTheme, textStyle, type Theme } from "@gpuixui/tokens";
import { ThemeProvider, useTheme } from "@gpuixui/tokens/react";
import { type ReactNode } from "react";

const pad = (value: number): StyleDesc => ({ padding: value });
const row = (gap = 8): StyleDesc => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap,
});
const col = (gap = 8): StyleDesc => ({
  display: "flex",
  flexDirection: "column",
  gap,
});

const Label = ({
  children,
  role = "caption",
  tone,
}: {
  readonly children: ReactNode;
  readonly role?: Parameters<typeof textStyle>[1];
  readonly tone?: string;
}) => {
  const theme = useTheme();
  return (
    <text
      style={{
        ...textStyle(theme, role),
        color: tone ?? theme.colors.mutedForeground,
      }}
    >
      {children}
    </text>
  );
};

const Panel = ({
  children,
  style,
}: {
  readonly children: ReactNode;
  readonly style?: StyleDesc;
}) => {
  const theme = useTheme();
  return (
    <div
      style={{
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const Chip = ({
  children,
  active,
}: {
  children: ReactNode;
  active?: boolean;
}) => {
  const theme = useTheme();
  return (
    <div
      style={{
        ...pad(4),
        paddingLeft: 8,
        paddingRight: 8,
        borderRadius: 999,
        backgroundColor: active ? theme.colors.accent : theme.colors.secondary,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: active
            ? theme.colors.accentForeground
            : theme.colors.secondaryForeground,
        }}
      >
        {children}
      </text>
    </div>
  );
};

/** A window's chrome: the app bar sits under the traffic lights. */
const Lights = () => (
  <div style={{ ...row(8) }}>
    {["#ff5f57", "#febc2e", "#28c840"].map((color) => (
      <div
        key={color}
        style={{
          width: 12,
          height: 12,
          borderRadius: 999,
          backgroundColor: color,
        }}
      />
    ))}
  </div>
);

const AppBar = ({
  title,
  tabs,
  active,
}: {
  title: string;
  tabs: string[];
  active: number;
}) => {
  const theme = useTheme();
  return (
    <div
      style={{
        ...row(14),
        paddingLeft: 14,
        paddingRight: 16,
        height: 44,
        borderBottomWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.muted,
      }}
    >
      <Lights />
      <text
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        {title}
      </text>
      <div style={{ ...row(6) }}>
        {tabs.map((tab, index) => (
          <Chip active={index === active} key={tab}>
            {tab}
          </Chip>
        ))}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ files -- */

const FILES = [
  ["Design system.fig", "12.4 MB", "Today"],
  ["Launch film.mp4", "84.2 MB", "Today"],
  ["Tokens.json", "18 KB", "Yesterday"],
  ["Icon set.zip", "2.1 MB", "Yesterday"],
  ["Notes.md", "6 KB", "Monday"],
  ["Palette.png", "1.8 MB", "Monday"],
  ["Archive", "—", "Last week"],
];

const Files = ({ frame }: { readonly frame: number }) => {
  const theme = useTheme();
  const current = Math.floor(frame / 46) % FILES.length;

  return (
    <div
      style={{
        ...col(0),
        height: "100%",
        backgroundColor: theme.colors.background,
      }}
    >
      <AppBar active={0} tabs={["Library", "Shared", "Recent"]} title="Files" />
      <div
        style={{
          ...row(0),
          alignItems: "stretch",
          flexGrow: 1,
          flexShrink: 1,
          flexBasis: 0,
          minHeight: 0,
        }}
      >
        <div
          style={{
            ...col(4),
            width: 200,
            padding: 10,
            borderRightWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.muted,
          }}
        >
          <Label role="caption">Favourites</Label>
          {["Recents", "Projects", "Design", "Film", "Archive"].map(
            (item, index) => (
              <div
                key={item}
                style={{
                  ...pad(7),
                  borderRadius: theme.radius.md,
                  backgroundColor:
                    index === 1 ? theme.colors.accent : undefined,
                }}
              >
                <text
                  style={{
                    ...textStyle(theme, "body"),
                    color:
                      index === 1
                        ? theme.colors.accentForeground
                        : theme.colors.mutedForeground,
                  }}
                >
                  {item}
                </text>
              </div>
            ),
          )}
        </div>

        <div
          style={{
            ...col(2),
            flexGrow: 1,
            flexShrink: 1,
            flexBasis: 0,
            padding: 12,
            minWidth: 0,
          }}
        >
          <div style={{ ...row(6), paddingBottom: 6 }}>
            <text
              style={{
                ...textStyle(theme, "h3"),
                color: theme.colors.foreground,
              }}
            >
              Projects
            </text>
            <Chip>{`${FILES.length} items`}</Chip>
          </div>
          {FILES.map(([name, size, when], index) => (
            <div
              key={name}
              style={{
                ...row(10),
                height: 36,
                paddingLeft: 8,
                paddingRight: 8,
                borderRadius: theme.radius.md,
                backgroundColor:
                  index === current
                    ? theme.colors.accent
                    : index === current - 1
                      ? theme.colors.hover
                      : undefined,
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  backgroundColor:
                    index === current
                      ? theme.colors.accentForeground
                      : theme.colors.mutedForeground,
                  opacity: index === current ? 0.9 : 0.45,
                }}
              />
              <text
                style={{
                  ...textStyle(theme, "body"),
                  flexGrow: 1,
                  color:
                    index === current
                      ? theme.colors.accentForeground
                      : theme.colors.foreground,
                }}
              >
                {name}
              </text>
              <Label>{size}</Label>
              <Label>{when}</Label>
            </div>
          ))}
        </div>

        <div
          style={{
            width: 240,
            padding: 12,
            borderLeftWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Panel style={{ ...col(8), padding: 12 }}>
            <div
              style={{
                height: 92,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.muted,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            />
            <text
              style={{
                ...textStyle(theme, "body"),
                color: theme.colors.foreground,
              }}
            >
              {FILES[current]?.[0] ?? ""}
            </text>
            <Label>{`${FILES[current]?.[1] ?? ""} · ${FILES[current]?.[2] ?? ""}`}</Label>
            <div style={{ ...row(6) }}>
              <Chip active>Open</Chip>
              <Chip>Share</Chip>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ tasks -- */

const COLUMNS = [
  ["Backlog", ["Token audit", "Icon pass", "Docs sweep"]],
  ["In progress", ["Launch film", "Theme editor", "Registry"]],
  ["Done", ["Windows 7", "Sidebar rail", "Sound design"]],
];

const Tasks = ({ frame }: { readonly frame: number }) => {
  const theme = useTheme();
  const activeColumn = Math.floor(frame / 52) % COLUMNS.length;

  return (
    <div
      style={{
        ...col(0),
        height: "100%",
        backgroundColor: theme.colors.background,
      }}
    >
      <AppBar active={0} tabs={["Board", "List", "Timeline"]} title="Tasks" />
      <div
        style={{
          ...row(10),
          flexGrow: 1,
          padding: 12,
          alignItems: "flex-start",
        }}
      >
        {COLUMNS.map(([title, cards], index) => (
          <div
            key={title as string}
            style={{ ...col(8), flexGrow: 1, flexShrink: 1, flexBasis: 0 }}
          >
            <div style={{ ...row(6) }}>
              <text
                style={{
                  ...textStyle(theme, "body"),
                  color: theme.colors.foreground,
                }}
              >
                {title as string}
              </text>
              <Chip>{`${(cards as string[]).length}`}</Chip>
            </div>
            {index === activeColumn ? (
              <div
                style={{
                  ...col(6),
                  padding: 8,
                  borderRadius: theme.radius.lg,
                  backgroundColor: theme.colors.accent,
                }}
              >
                <Label tone={theme.colors.accentForeground}>Moving…</Label>
              </div>
            ) : null}
            {(cards as string[]).map((card, cardIndex) => (
              <Panel
                key={card}
                style={{
                  ...col(4),
                  padding: 10,
                  borderColor:
                    index === activeColumn && cardIndex === 0
                      ? theme.colors.primary
                      : theme.colors.border,
                  borderWidth: 1,
                }}
              >
                <text
                  style={{
                    ...textStyle(theme, "body"),
                    color: theme.colors.foreground,
                  }}
                >
                  {card}
                </text>
                <div style={{ ...row(4) }}>
                  <Chip>{index === 2 ? "Shipped" : "Design"}</Chip>
                  {cardIndex === 0 ? <Chip active>P1</Chip> : null}
                </div>
              </Panel>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ---------------------------------------------------------------- palette -- */

const COMMANDS = [
  "New window",
  "Toggle theme",
  "Open registry",
  "Install component",
  "Search docs",
  "Copy install command",
];

const QUERY = "install";

const Palette = ({ frame }: { readonly frame: number }) => {
  const theme = useTheme();
  const typed = Math.min(QUERY.length, Math.floor(frame / 14));
  const picked = Math.floor(frame / 44) % 4;

  const matches = COMMANDS.filter((command) =>
    command.toLowerCase().includes(QUERY.slice(0, typed).toLowerCase()),
  );

  return (
    <div
      style={{
        ...col(0),
        height: "100%",
        backgroundColor: theme.colors.background,
      }}
    >
      <AppBar
        active={1}
        tabs={["Overview", "Commands", "Settings"]}
        title="Workspace"
      />
      <div style={{ ...col(10), flexGrow: 1, padding: 14, opacity: 0.45 }}>
        {[0, 1, 2].map((index) => (
          <Panel key={index} style={{ ...col(6), padding: 12 }}>
            <div
              style={{
                height: 8,
                width: 120 + index * 40,
                borderRadius: 4,
                backgroundColor: theme.colors.muted,
              }}
            />
            <div
              style={{
                height: 8,
                width: 220,
                borderRadius: 4,
                backgroundColor: theme.colors.muted,
              }}
            />
          </Panel>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: 120,
          right: 120,
          top: 84,
          borderRadius: theme.radius.xl,
          borderWidth: 1,
          borderColor: theme.colors.borderStrong,
          backgroundColor: theme.colors.popover,
          boxShadow: {
            offsetX: 0,
            offsetY: 24,
            blurRadius: 60,
            spreadRadius: 0,
            color: theme.colors.shadow,
          },
          overflow: "hidden",
        }}
      >
        <div
          style={{
            ...row(8),
            padding: 12,
            borderBottomWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <text
            style={{
              ...textStyle(theme, "body"),
              color: theme.colors.foreground,
            }}
          >
            {QUERY.slice(0, typed)}
          </text>
          <div
            style={{
              width: 2,
              height: 16,
              backgroundColor: theme.colors.primary,
            }}
          />
          <Label>{`${matches.length} results`}</Label>
        </div>
        {matches.map((command, index) => (
          <div
            key={command}
            style={{
              ...row(8),
              padding: 10,
              paddingLeft: 14,
              backgroundColor:
                index === picked % Math.max(1, matches.length)
                  ? theme.colors.accent
                  : undefined,
            }}
          >
            <text
              style={{
                ...textStyle(theme, "body"),
                color:
                  index === picked % Math.max(1, matches.length)
                    ? theme.colors.accentForeground
                    : theme.colors.foreground,
              }}
            >
              {command}
            </text>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ entry -- */

const DEMOS = {
  files: {
    title: "Files",
    size: [940, 620] as const,
    body: (frame: number) => <Files frame={frame} />,
  },
  tasks: {
    title: "Tasks",
    size: [980, 620] as const,
    body: (frame: number) => <Tasks frame={frame} />,
  },
  palette: {
    title: "Workspace",
    size: [900, 620] as const,
    body: (frame: number) => <Palette frame={frame} />,
  },
} as const;

const name = (process.argv[2] ?? "files") as keyof typeof DEMOS;
const demo = DEMOS[name] ?? DEMOS.files;

const Themed = ({ children }: { readonly children: ReactNode }) => (
  <ThemeProvider theme={darkTheme as Theme}>{children}</ThemeProvider>
);

const capture = process.argv[3] === "capture";
const outDir = process.argv[4] ?? "/tmp/film/take";
const frames = Number(process.argv[5] ?? 240);

const scene = (frame: number) => (
  <Themed>
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: demo.size[0],
        height: demo.size[1],
        backgroundColor: darkTheme.colors.background,
      }}
    >
      {demo.body(frame)}
    </div>
  </Themed>
);

if (capture) {
  const renderer = createRenderer();
  renderer.init({
    title: demo.title,
    width: demo.size[0],
    height: demo.size[1],
    resizable: false,
  });
  const loop = startFrameLoop(renderer);
  const root = createRoot(renderer);
  root.render(scene(0));
  await new Promise((resolve) => setTimeout(resolve, 700));
  const { mkdir } = await import("node:fs/promises");
  await mkdir(outDir, { recursive: true });
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  for (let index = 0; index < frames; index += 1) {
    root.render(scene(index));
    await sleep(30);
    renderer.captureScreenshot(
      `${outDir}/${String(index).padStart(5, "0")}.png`,
    );
    if (index % 60 === 0) console.log(`frame ${index}/${frames}`);
  }
  console.log(`captured ${frames} frames into ${outDir}`);
  loop.stop();
  process.exit(0);
} else {
  render(scene(0), {
    title: demo.title,
    width: demo.size[0],
    height: demo.size[1],
    resizable: false,
  });
}
