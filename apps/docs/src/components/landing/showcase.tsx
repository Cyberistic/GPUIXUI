/**
 * The landing's showcase grid: small, working components.
 *
 * Every tile is a live miniature — typing, toggling, selecting, paging a
 * calendar, firing a toast — because a product grid of pictures says less than
 * a grid you can touch. The compositions are built on the site's tokens rather
 * than mounting full demos: a demo in a tile brings its own dark preview
 * surface and its own page-sized layout.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTheme } from "fumadocs-ui/provider/base";
import { themes } from "@gpuixui/tokens";
import {
  encodeQr,
  QrSymbol,
  qrPlacement,
  QR_QUIET_ZONE,
} from "@gpuixui/media/qr/encode";
import { previewFontStack } from "@/lib/fonts";
import { resolvePlatformTheme } from "@/lib/platform";
import { toCssVars } from "@/lib/theme-css";
import { ChatDemo, type Row } from "../docs/chat-demo";
import { ChartDemoBody } from "../docs/charts-demo";
import { ColorPickerWorkflowBody } from "../docs/color-picker-demo";
import {
  rankAt,
  ToastCardPreview,
  toastStackSlot,
  useToastPreview,
  type PreviewToast,
} from "../docs/demos";
import { OTPFieldDemo } from "../docs/otp-field-demo";
import { LandingScene } from "./landing";

/** The ink that reads on a given colour, by its measured luminance. */
const readableOn = (hex: string): string => {
  const value = hex.replace("#", "").slice(0, 6);
  const channel = (offset: number): number => {
    const raw = Number.parseInt(value.slice(offset, offset + 2), 16) / 255;
    return raw <= 0.04045 ? raw / 12.92 : ((raw + 0.055) / 1.055) ** 2.4;
  };
  const luminance =
    0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  return luminance > 0.45 ? "#000000" : "#ffffff";
};

/** Marks an element the first time it enters the viewport. */
const useInView = <T extends HTMLElement>() => {
  const element = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const node = element.current;
    if (node === null) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setSeen(true);
        observer.disconnect();
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { element, seen };
};

const Tile = ({
  children,
  className,
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
}) => (
  <div
    className={
      className === undefined
        ? "landing-grid-tile"
        : `landing-grid-tile ${className}`
    }
  >
    {children}
  </div>
);

/** Four tones; each button plays a different toast. */
/** The page's colour mode, read from the class the theme switch writes. */
const usePageMode = (): "light" | "dark" => {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const update = (): void =>
      setDark(document.documentElement.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);
  return dark ? "dark" : "light";
};

type ToastDraft = Omit<PreviewToast, "id">;

const TOAST_PRESSES: ReadonlyArray<{
  readonly label: string;
  readonly toast: ToastDraft;
}> = [
  {
    label: "Publish changes",
    toast: {
      title: "Changes published",
      description: "The site rebuilds in about a minute.",
      tone: "success",
      actionLabel: "Undo",
      duration: 8_000,
    },
  },
  {
    label: "Fill the disk",
    toast: {
      title: "Disk almost full",
      description: "1.2 GB left on this volume.",
      tone: "warning",
    },
  },
  {
    label: "Delete repo",
    toast: {
      title: "Repository deleted",
      description: "The remote refused the last write.",
      tone: "danger",
    },
  },
  {
    label: "Sync",
    toast: {
      title: "Sync started",
      description: "Changes will land in a few seconds.",
      tone: "info",
    },
  },
];

/** The toast tile: each press posts a toast onto the page itself. */
function ToastTile({
  onToast,
}: {
  readonly onToast: (toast: ToastDraft) => void;
}) {
  return (
    <Tile className="landing-grid-tile-toast">
      <span className="landing-mini-label">Workspace</span>
      <div className="landing-mini-toast-actions">
        {TOAST_PRESSES.map((press) => (
          <button
            className="landing-mini-btn"
            key={press.label}
            onClick={() => onToast(press.toast)}
            type="button"
          >
            {press.label}
          </button>
        ))}
      </div>
      <p className="landing-mini-foot">
        Every press posts a toast on the page.
      </p>
    </Tile>
  );
}

/** The registry install line, in the terminal's own colours. */
function CodeTile() {
  return (
    <Tile className="landing-grid-tile-code">
      <code className="landing-code-command">
        <span data-token="cmd">npx</span>{" "}
        <span data-token="pkg">shadcn@latest</span>{" "}
        <span data-token="verb">add</span>{" "}
        <span data-token="name">@sudokw/primitives-button</span>
      </code>
    </Tile>
  );
}

function FormTile() {
  const [sent, setSent] = useState(false);
  return (
    <Tile>
      <label className="landing-mini-label" htmlFor="mini-name">
        Name
      </label>
      <input
        className="landing-mini-input"
        id="mini-name"
        defaultValue="Gon Freecss"
      />
      <label className="landing-mini-label" htmlFor="mini-note">
        Message
      </label>
      <textarea
        className="landing-mini-textarea"
        id="mini-note"
        defaultValue="The workspace is ready for review."
      />
      <button
        className="landing-mini-btn"
        data-variant="primary"
        onClick={() => {
          setSent(true);
          setTimeout(() => setSent(false), 1400);
        }}
        type="button"
      >
        {sent ? "Sent ✓" : "Send"}
      </button>
    </Tile>
  );
}

const TABS = [
  ["Profile", "Name, avatar and timezone."],
  ["Alerts", "Deploy and billing alerts."],
  ["Billing", "Plan, seats and next invoice."],
] as const;

function TabsTile() {
  const [tab, setTab] = useState(0);
  const triggers = useRef<Array<HTMLButtonElement | null>>([]);
  const [indicator, setIndicator] = useState<{ x: number; w: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    const element = triggers.current[tab];
    if (element === null || element === undefined) return;
    const update = () =>
      setIndicator({ x: element.offsetLeft, w: element.offsetWidth });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [tab]);

  return (
    <Tile>
      <div
        aria-label="Account settings"
        className="gx-tabs-list landing-mini-tabs"
        role="tablist"
      >
        {indicator === null ? null : (
          <span
            aria-hidden="true"
            className="gx-tabs-indicator"
            style={{
              transform: `translateX(${indicator.x}px)`,
              width: indicator.w,
            }}
          />
        )}
        {TABS.map(([label], index) => (
          <button
            aria-selected={index === tab}
            className="gx-tab"
            data-on={index === tab || undefined}
            key={label}
            onClick={() => setTab(index)}
            ref={(element) => {
              triggers.current[index] = element;
            }}
            role="tab"
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      <p className="landing-mini-note" key={tab}>
        {TABS[tab]?.[1]}
      </p>
    </Tile>
  );
}

function NotificationsTile() {
  const [on, setOn] = useState<ReadonlyArray<boolean>>([true, true, false]);
  const labels = ["Transaction alerts", "Security alerts", "Goal milestones"];
  return (
    <Tile>
      <p className="landing-mini-caption">Notifications</p>
      {labels.map((label, index) => (
        <button
          className="landing-mini-check"
          key={label}
          onClick={() =>
            setOn((rows) =>
              rows.map((value, at) => (at === index ? !value : value)),
            )
          }
          type="button"
        >
          <i data-on={on[index] || undefined}>✓</i>
          {label}
        </button>
      ))}
    </Tile>
  );
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** November 2026, the month the tile opens on. */
const START = { year: 2026, month: 10 } as const;

function CalendarTile() {
  const [offset, setOffset] = useState(0);
  const [day, setDay] = useState(10);
  const index = START.month + offset;
  const year = START.year + Math.floor(index / 12);
  const month = ((index % 12) + 12) % 12;
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const lead = (first + 6) % 7;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return (
    <Tile>
      <div className="landing-mini-calendar-head">
        <b>
          {MONTHS[month]} {year}
        </b>
        <span>
          <button
            className="landing-mini-nav"
            onClick={() => setOffset((n) => n - 1)}
            type="button"
          >
            ‹
          </button>
          <button
            className="landing-mini-nav"
            onClick={() => setOffset((n) => n + 1)}
            type="button"
          >
            ›
          </button>
        </span>
      </div>
      <div className="landing-mini-calendar">
        {["M", "T", "W", "T", "F", "S", "S"].map((label, at) => (
          <i className="landing-mini-dow" key={`${label}-${at}`}>
            {label}
          </i>
        ))}
        {Array.from({ length: lead }, (_, at) => (
          <i key={`lead-${at}`} />
        ))}
        {Array.from({ length: days }, (_, at) => {
          const value = at + 1;
          return (
            <button
              className="landing-mini-day"
              data-on={(value === day && offset === 0) || undefined}
              key={value}
              onClick={() => {
                setDay(value);
                setOffset(0);
              }}
              type="button"
            >
              {value}
            </button>
          );
        })}
      </div>
    </Tile>
  );
}

function RatingTile() {
  const [rating, setRating] = useState(4);
  return (
    <Tile className="landing-grid-tile-rating">
      <div className="landing-mini-stars" role="radiogroup">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            aria-checked={star === rating}
            className="landing-mini-star"
            data-on={star <= rating || undefined}
            key={star}
            onClick={() => setRating(star)}
            role="radio"
            type="button"
          >
            ★
          </button>
        ))}
      </div>
      <p className="landing-mini-foot">{rating}.0 of 5</p>
    </Tile>
  );
}

function TogglesTile() {
  const [on, setOn] = useState<ReadonlyArray<boolean>>([
    true,
    false,
    false,
    true,
  ]);
  const labels = ["Small", "Medium", "Destroy data", "Reduced motion"];
  return (
    <Tile>
      {labels.map((label, index) => (
        <button
          className="landing-mini-toggle-row"
          key={label}
          onClick={() =>
            setOn((rows) =>
              rows.map((value, at) => (at === index ? !value : value)),
            )
          }
          type="button"
        >
          {label}
          <span
            className="landing-mini-switch"
            data-on={on[index] || undefined}
          >
            <i />
          </span>
        </button>
      ))}
    </Tile>
  );
}

function AlertsTile() {
  const [hidden, setHidden] = useState<ReadonlyArray<number>>([]);
  const alerts = [
    ["info", "Update available", "Version 2.4 is ready to install."],
    ["success", "Changes published", "The site rebuilds in under a minute."],
    ["danger", "Upload failed", "The connection closed first."],
  ] as const;
  return (
    <Tile className="landing-grid-tile-alerts">
      {alerts.map(([tone, title, body], index) =>
        hidden.includes(index) ? null : (
          <div className="landing-mini-alert" data-tone={tone} key={title}>
            <span>
              <b>{title}</b>
              {body}
            </span>
            <button
              aria-label={`Dismiss ${title}`}
              className="landing-mini-dismiss"
              onClick={() => setHidden((rows) => [...rows, index])}
              type="button"
            >
              ×
            </button>
          </div>
        ),
      )}
      {hidden.length === 3 ? (
        <button
          className="landing-mini-btn"
          onClick={() => setHidden([])}
          type="button"
        >
          Reset
        </button>
      ) : null}
    </Tile>
  );
}

function MenuTile() {
  const [active, setActive] = useState("Analytics");
  const groups = [
    ["Overview", "Analytics", "Transactions", "Investments"],
    ["Profile", "Billing", "Security", "Appearance"],
  ] as const;
  return (
    <Tile>
      {groups.map((rows) => (
        <div className="landing-mini-menu" key={rows[0]}>
          {rows.map((row) => (
            <button
              className="landing-mini-menu-row"
              data-on={row === active || undefined}
              key={row}
              onClick={() => setActive(row)}
              type="button"
            >
              {row}
            </button>
          ))}
        </div>
      ))}
    </Tile>
  );
}

function SelectTile() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("Enhancement");
  const options = [
    "Enhancement",
    "Transmutation",
    "Conjuration",
    "Specialization",
  ];
  return (
    <Tile className="landing-grid-tile-select">
      <span className="landing-mini-label">Nen category</span>
      <div className="landing-mini-select-wrap">
        <button
          aria-expanded={open}
          className="landing-mini-select"
          onClick={() => setOpen((state) => !state)}
          type="button"
        >
          {value}
        </button>
        {open ? (
          <div className="landing-mini-options">
            {options.map((option) => (
              <button
                className="landing-mini-option"
                data-on={option === value || undefined}
                key={option}
                onClick={() => {
                  setValue(option);
                  setOpen(false);
                }}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </Tile>
  );
}

function StatsTile() {
  return (
    <Tile>
      <p className="landing-mini-caption">This month</p>
      <p className="landing-mini-metric">1,211.29</p>
      <div className="landing-mini-bars" aria-hidden="true">
        {[38, 62, 48, 81, 57, 72, 46].map((height, index) => (
          <i key={index} style={{ height: `${height}%` }} />
        ))}
      </div>
      <p className="landing-mini-foot">Pending setup · 2 services</p>
    </Tile>
  );
}

function ProgressTile() {
  const [progress, setProgress] = useState(30);
  return (
    <Tile>
      {[
        ["Sync", progress],
        ["Index", Math.min(100, progress + 40)],
        ["Upload", Math.min(100, progress + 10)],
      ].map(([label, value]) => (
        <div className="landing-mini-progress" key={String(label)}>
          <span>
            {label} · {value}%
          </span>
          <div>
            <i style={{ width: `${value}%` }} />
          </div>
        </div>
      ))}
      <button
        className="landing-mini-btn"
        onClick={() => setProgress((value) => (value >= 90 ? 10 : value + 20))}
        type="button"
      >
        Advance
      </button>
    </Tile>
  );
}

/** The shipped colour picker, on the page's own theme. */
function ColorTile({
  defaultValue,
  onPrimary,
}: {
  readonly defaultValue: string;
  readonly onPrimary: (value: string) => void;
}) {
  const mode = usePageMode();
  const theme = mode === "dark" ? themes.dark : themes.light;
  return (
    <Tile className="landing-grid-tile-picker">
      <div className="landing-mini-picker">
        <ColorPickerWorkflowBody
          defaultValue={defaultValue}
          initiallyOpen={false}
          label="Primary colour"
          onValueChange={onPrimary}
          portal
          theme={theme}
        />
      </div>
    </Tile>
  );
}

/** The toolbar above the grid: it themes every tile on the page. */
/** The theme card: platform chrome around the page-wide theme switches. */
function ThemeTile({
  platform,
  onPlatform,
}: {
  readonly platform: string;
  readonly onPlatform: (value: string) => void;
}) {
  const { setTheme } = useTheme();
  const mode = usePageMode();
  const choosePlatform = (value: string): void => {
    onPlatform(value);
    window.dispatchEvent(
      new CustomEvent("landing-platform", { detail: value }),
    );
  };
  return (
    <Tile className="landing-grid-tile-theme">
      <div className="landing-mini-titlebar" data-platform={platform}>
        {platform === "macos" ? (
          <span aria-hidden="true" className="landing-mini-lights">
            <i />
            <i />
            <i />
          </span>
        ) : null}
        <span className="landing-mini-title">Theme</span>
        {platform === "macos" ? null : (
          <span aria-hidden="true" className="landing-mini-window-controls">
            – □ ×
          </span>
        )}
      </div>
      <div className="landing-mini-segmented" role="group">
        {(["light", "dark"] as const).map((theme) => (
          <button
            aria-pressed={theme === mode}
            className="landing-mini-segment"
            data-on={theme === mode || undefined}
            key={theme}
            onClick={() => setTheme(theme)}
            type="button"
          >
            {theme === "light" ? "Light" : "Dark"}
          </button>
        ))}
      </div>
      <div className="landing-mini-segmented" role="group">
        {(
          [
            ["macos", "macOS"],
            ["windows", "Windows"],
            ["linux", "Linux"],
          ] as const
        ).map(([value, label]) => (
          <button
            aria-pressed={value === platform}
            className="landing-mini-segment"
            data-on={value === platform || undefined}
            key={value}
            onClick={() => choosePlatform(value)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
    </Tile>
  );
}

/** The site's own address: the QR opens this documentation. */
const SITE_URL = "https://gpuixui.sudokw.com";

/** One path holding every dark module, quiet zone included. */
const qrModules = (symbol: QrSymbol): string => {
  const quiet = Math.floor(QR_QUIET_ZONE);
  return Array.from({ length: symbol.modules }, (_, row) => row)
    .flatMap((row) =>
      Array.from({ length: symbol.modules }, (_, col) => col).flatMap((col) =>
        symbol.isDark(row, col)
          ? [`M${col + quiet} ${row + quiet}h1v1h-1z`]
          : [],
      ),
    )
    .join("");
};

function QrTile() {
  const [copied, setCopied] = useState(false);
  const encoding = encodeQr(SITE_URL);
  const symbol = encoding instanceof QrSymbol ? encoding : undefined;
  const copy = (): void => {
    void navigator.clipboard
      ?.writeText(SITE_URL)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => setCopied(false));
  };
  if (symbol === undefined) return null;
  const placement = qrPlacement(symbol, 118, QR_QUIET_ZONE);
  return (
    <Tile>
      <p className="landing-mini-caption">Scan to open the docs</p>
      <div className="landing-mini-qr">
        <svg
          aria-label={`QR code for ${SITE_URL}`}
          className="landing-mini-qr-svg"
          height={placement.side}
          role="img"
          viewBox={`0 0 ${placement.cells} ${placement.cells}`}
          width={placement.side}
        >
          <rect
            fill="#FFFFFF"
            height={placement.cells}
            width={placement.cells}
          />
          <path d={qrModules(symbol)} fill="#111111" />
        </svg>
      </div>
      <p className="landing-mini-foot">{SITE_URL}</p>
      <button
        className="landing-mini-btn"
        data-variant="primary"
        onClick={copy}
        type="button"
      >
        {copied ? "Copied ✓" : "Copy link"}
      </button>
    </Tile>
  );
}

/** A chart from the package's own geometry, on the tile's theme. */
function ChartTile({
  mode,
  platform,
  primary,
  primaryForeground,
}: {
  readonly mode: "lines" | "radar";
  readonly platform: string;
  readonly primary: string;
  readonly primaryForeground: string;
}) {
  const pageMode = usePageMode();
  const name =
    platform === "windows"
      ? "win32"
      : platform === "linux"
        ? "linux"
        : "darwin";
  const theme = resolvePlatformTheme(name, pageMode);
  const { element, seen } = useInView<HTMLDivElement>();
  return (
    <Tile className="landing-grid-tile-chart">
      <div
        className="landing-chart"
        data-chart={mode}
        data-inview={seen || undefined}
        ref={element}
        style={
          {
            ...toCssVars(theme),
            "--font-sans": previewFontStack(theme, name),
            "--primary": primary,
            "--primary-foreground": primaryForeground,
            "--ring": primary,
            "--radius": `${theme.radius.md}px`,
          } as React.CSSProperties
        }
      >
        <ChartDemoBody mode={mode} theme={theme} />
      </div>
    </Tile>
  );
}

const HXH_THREAD: ReadonlyArray<Row> = [
  {
    id: 1,
    role: "user",
    body: "Killua, look — this is the trail to the exam.",
    at: "07:12",
    live: false,
    image: {
      src: "/hxh-wp.jpg",
      alt: "Gon and Killua on a sunlit hillside trail on Whale Island.",
    },
  },
  {
    id: 2,
    role: "assistant",
    body: "Whale Island. You grew up there.",
    at: "07:12",
    live: false,
  },
  {
    id: 3,
    role: "assistant",
    body: "The exam starts tomorrow. Boat, not shortcut.",
    at: "07:13",
    live: false,
    reaction: "🎣",
  },
  {
    id: 4,
    role: "user",
    body: "Then we take the boat. And the shortcut.",
    at: "07:13",
    live: false,
  },
];

/** Gon and Killua, on the library's chat drawing. */
function ChatTile({
  platform,
  primary,
  primaryForeground,
}: {
  readonly platform: string;
  readonly primary: string;
  readonly primaryForeground: string;
}) {
  const mode = usePageMode();
  return (
    <Tile className="landing-grid-tile-demo landing-grid-tile-chat">
      <LandingScene
        className="landing-chat-scene"
        mode={mode}
        platform={platform}
        primary={primary}
        primaryForeground={primaryForeground}
      >
        <ChatDemo
          idleSummary="Whale Island → Hunter Exam."
          participants={{ user: "Gon", assistant: "Killua" }}
          placeholder="Message Killua…"
          reply="Fine. But I'm not carrying your fishing rod."
          seed={HXH_THREAD}
          title="Killua"
        />
      </LandingScene>
    </Tile>
  );
}

/** One OTP field, not the docs page's valid/refused pair. */
function OtpTile({
  platform,
  primary,
  primaryForeground,
}: {
  readonly platform: string;
  readonly primary: string;
  readonly primaryForeground: string;
}) {
  const mode = usePageMode();
  return (
    <Tile className="landing-grid-tile-demo">
      <LandingScene
        className="landing-otp-scene"
        mode={mode}
        platform={platform}
        primary={primary}
        primaryForeground={primaryForeground}
      >
        <OTPFieldDemo showInvalid={false} />
      </LandingScene>
    </Tile>
  );
}

export function Showcase() {
  const [platform, setPlatform] = useState("macos");
  const [chosenPrimary, setChosenPrimary] = useState<string | undefined>();
  const toasts = useToastPreview();
  const mode = usePageMode();
  const primary = chosenPrimary ?? (mode === "dark" ? "#ffffff" : "#000000");
  const primaryForeground = readableOn(primary);
  const toastTheme = mode === "dark" ? themes.dark : themes.light;
  return (
    <>
      <div
        className="landing-grid"
        data-platform={platform}
        style={
          {
            "--landing-primary": primary,
            "--landing-on-primary": primaryForeground,
          } as React.CSSProperties
        }
      >
        <div className="landing-grid-tiles">
          <ThemeTile onPlatform={setPlatform} platform={platform} />
          <CodeTile />
          <ToastTile onToast={toasts.push} />
          <FormTile />
          <ChartTile
            mode="radar"
            platform={platform}
            primary={primary}
            primaryForeground={primaryForeground}
          />
          <SelectTile />
          <AlertsTile />
          <ColorTile
            key={chosenPrimary === undefined ? mode : "chosen"}
            defaultValue={primary}
            onPrimary={setChosenPrimary}
          />
          <CalendarTile />
          <RatingTile />
          <ChartTile
            mode="lines"
            platform={platform}
            primary={primary}
            primaryForeground={primaryForeground}
          />
          <TabsTile />
          <OtpTile
            platform={platform}
            primary={primary}
            primaryForeground={primaryForeground}
          />
          <NotificationsTile />
          <MenuTile />
          <QrTile />
          <ChatTile
            platform={platform}
            primary={primary}
            primaryForeground={primaryForeground}
          />
          <ProgressTile />
          <TogglesTile />
          <StatsTile />
        </div>
      </div>
      <div
        aria-label="Notifications"
        className="landing-page-toasts"
        role="status"
        style={
          {
            ...toCssVars(toastTheme),
            "--font-sans": previewFontStack(toastTheme, "darwin"),
          } as React.CSSProperties
        }
      >
        <div
          className="gx-toast-stack"
          onMouseEnter={toasts.onStackEnter}
          onMouseLeave={toasts.onStackLeave}
          style={{ rowGap: toasts.hovered ? 12 : 0 }}
        >
          {toasts.entries.map((entry, index) => (
            <ToastCardPreview
              key={entry.toast.id}
              leaving={entry.leaving}
              onAction={() => toasts.dismiss(entry.toast.id)}
              onDismiss={() => toasts.dismiss(entry.toast.id)}
              slot={
                entry.frozen ??
                toastStackSlot(rankAt(toasts.entries, index), toasts.hovered)
              }
              toast={entry.toast}
            />
          ))}
        </div>
      </div>
    </>
  );
}
