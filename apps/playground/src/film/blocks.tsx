/**
 * The launch film's block demos: real GPUix windows, a synthetic cursor, and a
 * timeline that restyles the window through the platforms.
 *
 * Each frame is a pure function of its index: the block, the platform look, the
 * selected row and the cursor all come from the frame number, so a capture is
 * frame-accurate and repeatable. The cursor is drawn in the tree because an
 * offscreen capture has no OS pointer; two offset arrow paths give it an edge.
 *
 *   nub apps/playground/dist/film/blocks.js capture /tmp/film/take-blocks 1200
 */
import {
  createRenderer,
  createRoot,
  render,
  startFrameLoop,
  type StyleDesc,
} from "@gpuix/react";
import {
  darkTheme,
  lightTheme,
  platformTheme,
  retroTheme,
  textStyle,
  type Theme,
} from "@gpuixui/tokens";
import { ThemeProvider, useTheme } from "@gpuixui/tokens/react";

const WIDTH = 960;
const HEIGHT = 620;

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

type Chrome = "macos" | "windows" | "linux";
type BlockName = "files" | "board" | "inbox";

interface Beat {
  readonly theme: Theme;
  readonly chrome: Chrome;
  readonly label: string;
  readonly block: BlockName;
}

const macOS = platformTheme(darkTheme, "darwin");
const windows = platformTheme(darkTheme, "win32");
const linux = platformTheme(darkTheme, "linux");
const omarchyDark = retroTheme(darkTheme, "omarchy");
const omarchyLight = retroTheme(lightTheme, "omarchy");

const BEATS: readonly [Beat, ...Beat[]] = [
  { theme: macOS, chrome: "macos", label: "macOS", block: "files" },
  { theme: macOS, chrome: "macos", label: "macOS", block: "board" },
  { theme: windows, chrome: "windows", label: "Windows 11", block: "files" },
  { theme: windows, chrome: "windows", label: "Windows 11", block: "inbox" },
  { theme: linux, chrome: "linux", label: "Linux", block: "board" },
  {
    theme: omarchyDark,
    chrome: "linux",
    label: "Omarchy · Dark",
    block: "files",
  },
  {
    theme: omarchyLight,
    chrome: "linux",
    label: "Omarchy · Light",
    block: "inbox",
  },
];

/** Frames a beat holds: 150 is 2.5 s at 60 fps. */
const FRAMES_PER_BEAT = 150;

const beatAt = (frame: number): Beat =>
  BEATS[Math.min(BEATS.length - 1, Math.floor(frame / FRAMES_PER_BEAT))] ??
  BEATS[0];

/* ----------------------------------------------------------------- cursor -- */

/** The classic arrow, as one path in a 18×24 box. */
const ARROW =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 24"><path d="M2 2 L2 19 L7 14.5 L10.5 22 L14 20.4 L10.5 13 L17 12.6 Z"/></svg>';

/** A point on the cursor's path at a frame: waypoints, eased between. */
const waypoints: ReadonlyArray<{
  readonly at: number;
  readonly x: number;
  readonly y: number;
}> = [
  { at: 0, x: 520, y: 300 },
  { at: 30, x: 700, y: 250 },
  { at: 52, x: 640, y: 330 },
  { at: 96, x: 520, y: 300 },
  { at: 130, x: 760, y: 380 },
  { at: 168, x: 600, y: 420 },
  { at: 192, x: 700, y: 250 },
  { at: 240, x: 640, y: 340 },
  { at: 288, x: 540, y: 300 },
  { at: 330, x: 760, y: 300 },
  { at: 384, x: 620, y: 360 },
  { at: 430, x: 540, y: 300 },
  { at: 480, x: 700, y: 250 },
  { at: 530, x: 560, y: 380 },
  { at: 576, x: 700, y: 300 },
  { at: 620, x: 520, y: 300 },
  { at: 672, x: 720, y: 340 },
  { at: 760, x: 560, y: 300 },
  { at: 860, x: 700, y: 360 },
  { at: 960, x: 600, y: 300 },
  { at: 1040, x: 540, y: 340 },
];

const FIRST = { at: 0, x: 520, y: 300 };

const cursorAt = (frame: number): { x: number; y: number } => {
  const before =
    [...waypoints].reverse().find((point) => point.at <= frame) ?? FIRST;
  const after = waypoints.find((point) => point.at > frame) ?? before;
  if (after.at === before.at) return { x: before.x, y: before.y };
  const t = (frame - before.at) / (after.at - before.at);
  const ease = 1 - Math.pow(1 - t, 3);
  return {
    x: before.x + (after.x - before.x) * ease,
    y: before.y + (after.y - before.y) * ease,
  };
};

/** The press at 130, 330 and 530 frames: a ring that grows and fades. */
const CLICKS = [70, 260, 460, 700, 900];
const rippleAt = (frame: number) => {
  const click = [...CLICKS]
    .reverse()
    .find((at) => frame >= at && frame < at + 26);
  if (click === undefined) return undefined;
  const age = (frame - click) / 26;
  const anchor = cursorAt(click);
  return { ...anchor, size: 10 + 34 * age, opacity: 0.8 * (1 - age) };
};

const Cursor = ({ frame }: { readonly frame: number }) => {
  const theme = useTheme();
  const at = cursorAt(frame);
  const ripple = rippleAt(frame);
  return (
    <>
      <svg
        source={ARROW}
        style={{
          position: "absolute",
          left: at.x + 1,
          top: at.y + 1,
          width: 18,
          height: 24,
          color: theme.colors.background,
          opacity: 0.9,
        }}
      />
      <svg
        source={ARROW}
        style={{
          position: "absolute",
          left: at.x,
          top: at.y,
          width: 18,
          height: 24,
          color: theme.colors.foreground,
        }}
      />
      {ripple === undefined ? null : (
        <div
          style={{
            position: "absolute",
            left: ripple.x - ripple.size / 2,
            top: ripple.y - ripple.size / 2,
            width: ripple.size,
            height: ripple.size,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: theme.colors.foreground,
            opacity: ripple.opacity,
          }}
        />
      )}
    </>
  );
};

/* ----------------------------------------------------------------- chrome -- */

const Lights = ({ chrome, theme }: { chrome: Chrome; theme: Theme }) =>
  chrome === "macos" ? (
    <div style={row(8)}>
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
  ) : chrome === "windows" ? (
    <div style={row(20)}>
      <text
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        Library
      </text>
      <div style={row(0)}>
        {(["min", "max", "close"] as const).map((kind) => (
          <div
            key={kind}
            style={{
              width: 32,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: kind === "close" ? "#c42b1c" : undefined,
            }}
          >
            <div
              style={{
                width: kind === "max" ? 8 : 10,
                height: kind === "max" ? 8 : 1,
                borderWidth: kind === "max" ? 1 : 0,
                borderColor: "#ffffff",
                backgroundColor: kind === "max" ? undefined : "#ffffff",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  ) : (
    <div style={row(6)}>
      {[0, 1].map((index) => (
        <div
          key={index}
          style={{
            width: 14,
            height: 14,
            borderRadius: 999,
            backgroundColor: theme.colors.borderStrong,
          }}
        />
      ))}
    </div>
  );

const TitleBar = ({ beat }: { readonly beat: Beat }) => {
  const theme = useTheme();
  return (
    <div
      style={{
        ...row(12),
        height: beat.chrome === "windows" ? 32 : 38,
        paddingLeft: 14,
        paddingRight: beat.chrome === "windows" ? 0 : 14,
        borderBottomWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.muted,
      }}
    >
      <Lights chrome={beat.chrome} theme={theme} />
      <div style={{ flexGrow: 1 }} />
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {beat.label}
      </text>
      {beat.chrome === "windows" ? null : <div style={{ width: 40 }} />}
    </div>
  );
};

/* ----------------------------------------------------------------- blocks -- */

const FILES = [
  ["Design system.fig", "12.4 MB", "Today"],
  ["Launch film.mp4", "84.2 MB", "Today"],
  ["Tokens.json", "18 KB", "Yesterday"],
  ["Icon set.zip", "2.1 MB", "Yesterday"],
  ["Notes.md", "6 KB", "Monday"],
  ["Palette.png", "1.8 MB", "Monday"],
];

const FilesBlock = ({ frame }: { readonly frame: number }) => {
  const theme = useTheme();
  const current = Math.floor(frame / 42) % FILES.length;
  return (
    <div
      style={{ ...row(0), flexGrow: 1, alignItems: "stretch", minHeight: 0 }}
    >
      <div
        style={{
          ...col(3),
          width: 186,
          padding: 10,
          borderRightWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.muted,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
            padding: 6,
          }}
        >
          Favourites
        </text>
        {["Recents", "Projects", "Design", "Film", "Archive"].map(
          (item, index) => (
            <div
              key={item}
              style={{
                padding: 7,
                borderRadius: theme.radius.md,
                backgroundColor: index === 1 ? theme.colors.accent : undefined,
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
      <div style={{ ...col(2), flexGrow: 1, padding: 12, minWidth: 0 }}>
        <div style={row(8)}>
          <text
            style={{
              ...textStyle(theme, "h3"),
              color: theme.colors.foreground,
            }}
          >
            Projects
          </text>
          <div
            style={{
              paddingLeft: 8,
              paddingRight: 8,
              paddingTop: 2,
              paddingBottom: 2,
              borderRadius: 999,
              backgroundColor: theme.colors.secondary,
            }}
          >
            <text
              style={{
                ...textStyle(theme, "caption"),
                color: theme.colors.secondaryForeground,
              }}
            >{`${FILES.length} items`}</text>
          </div>
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
                index === current ? theme.colors.accent : undefined,
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                backgroundColor:
                  index === current
                    ? theme.colors.accentForeground
                    : theme.colors.mutedForeground,
                opacity: index === current ? 1 : 0.5,
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
            <text
              style={{
                ...textStyle(theme, "body"),
                color: theme.colors.mutedForeground,
              }}
            >
              {size}
            </text>
            <text
              style={{
                ...textStyle(theme, "body"),
                color: theme.colors.mutedForeground,
                width: 74,
              }}
            >
              {when}
            </text>
          </div>
        ))}
      </div>
      <div
        style={{
          ...col(8),
          width: 210,
          padding: 12,
          borderLeftWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        <div
          style={{
            height: 84,
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
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >{`${FILES[current]?.[1] ?? ""} · ${FILES[current]?.[2] ?? ""}`}</text>
        <div style={row(6)}>
          {["Open", "Share"].map((label, index) => (
            <div
              key={label}
              style={{
                paddingLeft: 10,
                paddingRight: 10,
                paddingTop: 3,
                paddingBottom: 3,
                borderRadius: 999,
                backgroundColor:
                  index === 0 ? theme.colors.primary : theme.colors.secondary,
              }}
            >
              <text
                style={{
                  ...textStyle(theme, "caption"),
                  color:
                    index === 0
                      ? theme.colors.primaryForeground
                      : theme.colors.secondaryForeground,
                }}
              >
                {label}
              </text>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const BOARD = [
  ["Backlog", ["Token audit", "Icon pass", "Docs sweep"]],
  ["In progress", ["Launch film", "Theme editor", "Registry"]],
  ["Done", ["Omarchy", "Sidebar rail", "Sound design"]],
] as const;

const BoardBlock = ({ frame }: { readonly frame: number }) => {
  const theme = useTheme();
  const hovered = Math.floor(frame / 46) % 9;
  let index = 0;
  return (
    <div
      style={{ ...row(10), flexGrow: 1, padding: 12, alignItems: "flex-start" }}
    >
      {BOARD.map(([title, cards]) => (
        <div key={title} style={{ ...col(8), flexGrow: 1, flexBasis: 0 }}>
          <div style={row(6)}>
            <text
              style={{
                ...textStyle(theme, "body"),
                color: theme.colors.foreground,
              }}
            >
              {title}
            </text>
            <text
              style={{
                ...textStyle(theme, "caption"),
                color: theme.colors.mutedForeground,
              }}
            >{`${cards.length}`}</text>
          </div>
          {cards.map((card) => {
            const current = index === hovered;
            index += 1;
            return (
              <div
                key={card}
                style={{
                  ...col(5),
                  padding: 10,
                  borderWidth: 1,
                  borderColor: current
                    ? theme.colors.primary
                    : theme.colors.border,
                  borderRadius: theme.radius.lg,
                  backgroundColor: theme.colors.card,
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
                <div style={row(4)}>
                  <div
                    style={{
                      paddingLeft: 8,
                      paddingRight: 8,
                      paddingTop: 2,
                      paddingBottom: 2,
                      borderRadius: 999,
                      backgroundColor: current
                        ? theme.colors.primary
                        : theme.colors.secondary,
                    }}
                  >
                    <text
                      style={{
                        ...textStyle(theme, "caption"),
                        color: current
                          ? theme.colors.primaryForeground
                          : theme.colors.secondaryForeground,
                      }}
                    >
                      {current ? "Moving" : "Design"}
                    </text>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const MAIL = [
  ["Design review", "Mara", "The new board lands today…", "09:12"],
  ["Launch film cut", "Benji", "Second pass, tighter pacing…", "08:40"],
  ["Registry live", "Ada", "158 components, one index…", "Yesterday"],
  ["Omarchy look", "Kai", "The light edition follows…", "Yesterday"],
] as const;

const InboxBlock = ({ frame }: { readonly frame: number }) => {
  const theme = useTheme();
  const current = Math.floor(frame / 46) % MAIL.length;
  return (
    <div
      style={{ ...row(0), flexGrow: 1, alignItems: "stretch", minHeight: 0 }}
    >
      <div
        style={{
          ...col(4),
          width: 168,
          padding: 10,
          borderRightWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.muted,
        }}
      >
        {["Inbox", "Starred", "Sent", "Drafts", "Trash"].map((item, index) => (
          <div
            key={item}
            style={{
              padding: 7,
              borderRadius: theme.radius.md,
              backgroundColor: index === 0 ? theme.colors.accent : undefined,
            }}
          >
            <text
              style={{
                ...textStyle(theme, "body"),
                color:
                  index === 0
                    ? theme.colors.accentForeground
                    : theme.colors.mutedForeground,
              }}
            >
              {item}
            </text>
          </div>
        ))}
      </div>
      <div
        style={{
          ...col(1),
          width: 340,
          borderRightWidth: 1,
          borderColor: theme.colors.border,
          paddingTop: 8,
        }}
      >
        {MAIL.map(([subject, from, , when], index) => (
          <div
            key={subject}
            style={{
              ...col(3),
              padding: 9,
              borderBottomWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor:
                index === current ? theme.colors.accent : undefined,
            }}
          >
            <div style={row(6)}>
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
                {subject}
              </text>
              <text
                style={{
                  ...textStyle(theme, "caption"),
                  color: theme.colors.mutedForeground,
                }}
              >
                {when}
              </text>
            </div>
            <text
              style={{
                ...textStyle(theme, "caption"),
                color: theme.colors.mutedForeground,
              }}
            >
              {from}
            </text>
          </div>
        ))}
      </div>
      <div style={{ ...col(10), flexGrow: 1, padding: 16, minWidth: 0 }}>
        <text
          style={{ ...textStyle(theme, "h3"), color: theme.colors.foreground }}
        >
          {MAIL[current]?.[0] ?? ""}
        </text>
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >{`${MAIL[current]?.[1] ?? ""} · ${MAIL[current]?.[3] ?? ""}`}</text>
        {[0, 1, 2, 3].map((line) => (
          <div
            key={line}
            style={{
              height: 8,
              width: line === 3 ? 240 : 420,
              borderRadius: 4,
              backgroundColor: theme.colors.muted,
            }}
          />
        ))}
        <div
          style={{
            paddingLeft: 10,
            paddingRight: 10,
            paddingTop: 4,
            paddingBottom: 4,
            borderRadius: 999,
            backgroundColor: theme.colors.secondary,
            alignSelf: "flex-start",
          }}
        >
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.secondaryForeground,
            }}
          >
            Reply
          </text>
        </div>
      </div>
    </div>
  );
};

const Blocks = ({ frame }: { readonly frame: number }) => {
  const theme = useTheme();
  const beat = beatAt(frame);
  return (
    <div
      style={{
        ...col(0),
        width: WIDTH,
        height: HEIGHT,
        backgroundColor: theme.colors.background,
      }}
    >
      <TitleBar beat={beat} />
      {beat.block === "files" ? <FilesBlock frame={frame} /> : null}
      {beat.block === "board" ? <BoardBlock frame={frame} /> : null}
      {beat.block === "inbox" ? <InboxBlock frame={frame} /> : null}
      <Cursor frame={frame} />
    </div>
  );
};

const scene = (frame: number) => (
  <ThemeProvider theme={beatAt(frame).theme}>
    <Blocks frame={frame} />
  </ThemeProvider>
);

const capture = process.argv[2] === "capture";
const outDir = process.argv[3] ?? "/tmp/film/take-blocks";
const frames = Number(process.argv[4] ?? 1200);

if (capture) {
  const renderer = createRenderer();
  renderer.init({
    title: "Library",
    width: WIDTH,
    height: HEIGHT,
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
    await sleep(26);
    renderer.captureScreenshot(
      `${outDir}/${String(index).padStart(5, "0")}.png`,
    );
    if (index % 300 === 0) console.log(`frame ${index}/${frames}`);
  }
  loop.stop();
  process.exit(0);
} else {
  render(scene(0), {
    title: "Library",
    width: WIDTH,
    height: HEIGHT,
    resizable: false,
  });
}
