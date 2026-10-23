import { useState } from "react";

/**
 * Settings dialog block — a modal two-pane settings window.
 *
 * The reproduction owns the state a reader can watch: the dark-mode switch
 * flips, the font-size slider moves and its value follows, the layout cards
 * select, and the left nav marks the active row. Every state change repaints —
 * fill, ring, transform — and never changes a border width, padding or size, so
 * the panel cannot move under the pointer.
 *
 * There is no settings component in the library; this is a recipe built from
 * `Dialog`, `SearchInput`, `Avatar`, `Button`, `Slider`, `Stack`, `Switch`,
 * `Text` and `Icon`.
 */

const SETTINGS_NAV = [
  {
    group: "PROFILES",
    items: [
      {
        id: "profiles",
        label: "Profiles",
        description: "Reusable tool bundles",
        icon: "users",
      },
    ],
  },
  {
    group: "PREFERENCES",
    items: [
      {
        id: "appearance",
        label: "Appearance",
        description: "Theme, font size and layout",
        icon: "sun",
      },
      {
        id: "notifications",
        label: "Notifications",
        description: "Alerts, email and sounds",
        icon: "bell",
      },
      {
        id: "profile",
        label: "User Profile",
        description: "Name, photo and presence",
        icon: "user",
      },
    ],
  },
  {
    group: "ADMINISTRATION",
    items: [
      {
        id: "team",
        label: "Team",
        description: "Members, roles and invites",
        icon: "users",
      },
      {
        id: "security",
        label: "Security",
        description: "Sessions, keys and two-factor",
        icon: "shield",
      },
      {
        id: "maintenance",
        label: "Maintenance",
        description: "Storage, backups and logs",
        icon: "wrench",
      },
    ],
  },
] as const;

export type SettingsSectionId =
  (typeof SETTINGS_NAV)[number]["items"][number]["id"];

export const messageLayouts = [
  {
    id: "classic",
    label: "Classic",
    description: "Cards with headers and content sections",
  },
  {
    id: "compact",
    label: "Compact",
    description: "Dense rows linked by a timeline rail",
  },
] as const;

export type MessageLayout = (typeof messageLayouts)[number]["id"];

export interface ThemeSettings {
  readonly darkMode: boolean;
  readonly fontSize: number;
  readonly layout: MessageLayout;
}

export const FONT_SIZE_MIN = 12;
export const FONT_SIZE_MAX = 20;

export const initialThemeSettings: ThemeSettings = {
  darkMode: true,
  fontSize: 15,
  layout: "classic",
};

/** A slider value inside the range, rounded to the label's whole pixels. */
export const clampFontSize = (value: number): number =>
  Number.isFinite(value)
    ? Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(value)))
    : initialThemeSettings.fontSize;

export const toggleDarkMode = (settings: ThemeSettings): ThemeSettings => ({
  ...settings,
  darkMode: !settings.darkMode,
});

export const setFontSize = (
  settings: ThemeSettings,
  value: number,
): ThemeSettings => ({ ...settings, fontSize: clampFontSize(value) });

export const selectLayout = (
  settings: ThemeSettings,
  layout: MessageLayout,
): ThemeSettings => ({ ...settings, layout });

const ICON = {
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
      <path d="M10 21h4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </>
  ),
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />,
  wrench: (
    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2.6-2.6Z" />
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
  type: (
    <>
      <path d="M4 6h16" />
      <path d="M12 6v14" />
      <path d="M9 20h6" />
    </>
  ),
  layout: (
    <>
      <rect height="7" rx="1" width="18" x="3" y="3" />
      <rect height="7" rx="1" width="8" x="3" y="14" />
      <rect height="7" rx="1" width="7" x="14" y="14" />
    </>
  ),
  check: <path d="m5 12 5 5L20 7" />,
} as const;

type GlyphName = keyof typeof ICON;

const Glyph = ({
  name,
  size = 14,
}: {
  readonly name: GlyphName;
  readonly size?: number;
}) => (
  <svg
    aria-hidden="true"
    className="gx-set-glyph"
    fill="none"
    height={size}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={1.8}
    viewBox="0 0 24 24"
    width={size}
  >
    {ICON[name]}
  </svg>
);

const SettingsNav = ({
  active,
  onSelect,
}: {
  readonly active: SettingsSectionId;
  readonly onSelect: (id: SettingsSectionId) => void;
}) => (
  <nav aria-label="Settings sections" className="gx-set-nav">
    {SETTINGS_NAV.map((group) => (
      <div className="gx-set-group" key={group.group}>
        <p className="gx-set-group-label">{group.group}</p>
        {group.items.map((item) => (
          <button
            aria-current={active === item.id ? "page" : undefined}
            className="gx-set-nav-item"
            data-active={active === item.id}
            key={item.id}
            onClick={() => onSelect(item.id)}
            type="button"
          >
            <span className="gx-set-nav-icon">
              <Glyph name={item.icon} />
            </span>
            <span className="gx-set-nav-text">
              <span className="gx-set-nav-label">{item.label}</span>
              <span className="gx-set-nav-desc">{item.description}</span>
            </span>
          </button>
        ))}
      </div>
    ))}
  </nav>
);

const LayoutPreview = ({ layout }: { readonly layout: MessageLayout }) => (
  <span aria-hidden="true" className="gx-set-mini" data-layout={layout}>
    <span />
    <span />
    <span />
  </span>
);

export const SettingsDialogRender = () => {
  const [active, setActive] = useState<SettingsSectionId>("appearance");
  const [settings, setSettings] = useState<ThemeSettings>(initialThemeSettings);

  return (
    <div className="gx-set-stage">
      <div
        aria-labelledby="gx-set-title"
        aria-modal="true"
        className="gx-set-panel"
        role="dialog"
      >
        <aside className="gx-set-side">
          <div className="gx-set-side-head">
            <h3 className="gx-set-title" id="gx-set-title">
              Settings
            </h3>
            <button
              aria-label="Close settings"
              className="gx-set-close"
              type="button"
            >
              <Glyph name="close" />
            </button>
          </div>
          <label className="gx-set-search">
            <Glyph name="search" size={13} />
            <input
              aria-label="Search settings"
              placeholder="Search"
              type="search"
            />
          </label>
          <SettingsNav active={active} onSelect={setActive} />
        </aside>
        <section aria-label="Theme" className="gx-set-body">
          <header className="gx-set-body-head">
            <h4 className="gx-set-heading">Theme</h4>
            <p className="gx-set-sub">
              Customize the look and feel of the application
            </p>
          </header>
          <div className="gx-set-rows">
            <div className="gx-set-row">
              <span className="gx-set-row-icon">
                <Glyph name="moon" />
              </span>
              <span className="gx-set-row-text">
                <span className="gx-set-row-title">Dark Mode</span>
                <span className="gx-set-row-desc">
                  Use the dark appearance across the application.
                </span>
              </span>
              <button
                aria-checked={settings.darkMode}
                aria-label="Dark Mode"
                className="gx-set-switch"
                data-on={settings.darkMode}
                onClick={() =>
                  setSettings((current) => toggleDarkMode(current))
                }
                role="switch"
                type="button"
              >
                <span className="gx-set-knob" />
              </button>
            </div>
            <div className="gx-set-row">
              <span className="gx-set-row-icon">
                <Glyph name="type" />
              </span>
              <span className="gx-set-row-text">
                <span className="gx-set-row-title">Font Size</span>
                <span className="gx-set-row-desc">
                  Set the base size for text in the application.
                </span>
              </span>
              <output className="gx-set-value" htmlFor="gx-set-font">
                {settings.fontSize}px
              </output>
            </div>
            <div className="gx-set-slider-row">
              <span
                aria-hidden="true"
                className="gx-set-slider-end gx-set-slider-end-sm"
              >
                A
              </span>
              <input
                aria-label="Font size"
                className="gx-set-slider"
                id="gx-set-font"
                max={FONT_SIZE_MAX}
                min={FONT_SIZE_MIN}
                onChange={(event) => {
                  const value = event.currentTarget.valueAsNumber;
                  setSettings((current) => setFontSize(current, value));
                }}
                type="range"
                value={settings.fontSize}
              />
              <span
                aria-hidden="true"
                className="gx-set-slider-end gx-set-slider-end-lg"
              >
                A
              </span>
            </div>
            <div className="gx-set-row">
              <span className="gx-set-row-icon">
                <Glyph name="layout" />
              </span>
              <span className="gx-set-row-text">
                <span className="gx-set-row-title">Message Layout</span>
                <span className="gx-set-row-desc">
                  Choose how messages are grouped in a conversation.
                </span>
              </span>
            </div>
            <div
              aria-label="Message layout"
              className="gx-set-layouts"
              role="radiogroup"
            >
              {messageLayouts.map((option) => {
                const selected = settings.layout === option.id;
                return (
                  <button
                    aria-checked={selected}
                    className="gx-set-layout"
                    key={option.id}
                    onClick={() =>
                      setSettings((current) => selectLayout(current, option.id))
                    }
                    role="radio"
                    type="button"
                  >
                    <LayoutPreview layout={option.id} />
                    <span className="gx-set-layout-text">
                      <span className="gx-set-layout-name">
                        {option.label}
                        <span
                          aria-hidden="true"
                          className="gx-set-check"
                          data-on={selected}
                        >
                          <Glyph name="check" size={12} />
                        </span>
                      </span>
                      <span className="gx-set-layout-desc">
                        {option.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export const settingsDialogPackages: ReadonlyArray<string> = [
  "@gpuixui/primitives",
  "@gpuixui/components",
  "@gpuixui/icons",
];

export const settingsDialogSource = `import { useState } from "react";
import { Avatar } from "@gpuixui/components/avatar";
import { Dialog, DialogContent, DialogTitle } from "@gpuixui/components/dialog";
import { SearchInput } from "@gpuixui/components/search-input";
import { Button, Slider, Stack, Switch, Text, useTheme } from "@gpuixui/primitives";
import { Icon } from "@gpuixui/icons";

const sections = [
  { group: "Profiles", items: [{ id: "profiles", label: "Profiles", hint: "Reusable tool bundles" }] },
  { group: "Preferences", items: [
    { id: "appearance", label: "Appearance", hint: "Theme, font size and layout" },
    { id: "notifications", label: "Notifications", hint: "Alerts, email and sounds" },
    { id: "profile", label: "User Profile", hint: "Name, photo and presence" },
  ] },
  { group: "Administration", items: [
    { id: "team", label: "Team", hint: "Members, roles and invites" },
    { id: "security", label: "Security", hint: "Sessions, keys and two-factor" },
    { id: "maintenance", label: "Maintenance", hint: "Storage, backups and logs" },
  ] },
] as const;

const layouts = [
  { id: "classic", label: "Classic", hint: "Cards with headers and content sections" },
  { id: "compact", label: "Compact", hint: "Dense rows linked by a timeline rail" },
] as const;

export function SettingsDialog() {
  const { theme } = useTheme();
  const [active, setActive] = useState("appearance");
  const [dark, setDark] = useState(true);
  const [size, setSize] = useState(15);
  const [layout, setLayout] = useState("classic");

  return (
    <Dialog open>
      <DialogContent size="lg">
        <DialogTitle>Settings</DialogTitle>
        <Stack direction="row" gap="none" style={{ minHeight: 520 }}>
          <Stack direction="column" gap="sm" style={{ width: 260, padding: 16 }}>
            <SearchInput aria-label="Search settings" placeholder="Search" />
            {sections.map((section) => (
              <Stack key={section.group} direction="column" gap="xs">
                <Text role="caption" tone="muted">{section.group}</Text>
                {section.items.map((item) => (
                  <Button
                    key={item.id}
                    variant={active === item.id ? "secondary" : "ghost"}
                    icon="chevron-right"
                    onActivate={() => setActive(item.id)}
                  >
                    {item.label}
                  </Button>
                ))}
              </Stack>
            ))}
          </Stack>
          <Stack direction="column" grow gap="md" style={{ padding: 24 }}>
            <Text role="title">Theme</Text>
            <Text role="caption" tone="muted">
              Customize the look and feel of the application
            </Text>
            <Stack direction="row" align="center" justify="between">
              <Stack direction="row" align="center" gap="sm">
                <Icon name="moon" color={theme.colors.mutedForeground} />
                <Text role="label">Dark Mode</Text>
              </Stack>
              <Switch label="Dark Mode" checked={dark} onCheckedChange={setDark} />
            </Stack>
            <Stack direction="row" align="center" gap="sm">
              <Icon name="type" color={theme.colors.mutedForeground} />
              <Text role="label">Font Size</Text>
              <Text role="caption" tone="muted">{size}px</Text>
            </Stack>
            <Slider
              label="Font size"
              min={12}
              max={20}
              value={size}
              onValueChange={setSize}
            />
            <Text role="label">Message Layout</Text>
            <Stack direction="row" gap="sm">
              {layouts.map((option) => (
                <Button
                  key={option.id}
                  variant={layout === option.id ? "secondary" : "outline"}
                  onActivate={() => setLayout(option.id)}
                >
                  {option.label}
                </Button>
              ))}
            </Stack>
            <Stack direction="row" align="center" gap="sm">
              <Avatar name="Dom" size="sm" />
              <Text role="caption" tone="muted">dom@hologram.co</Text>
            </Stack>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}`;
