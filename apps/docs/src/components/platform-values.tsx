import {
  platformTheme,
  platformTypes,
  textStyle,
  themes,
  type PlatformName,
} from "@gpuixui/tokens";
import { usePlatform } from "@/platform/platform-provider";

interface PlatformRow {
  readonly label: string;
  readonly value: string;
}

/**
 * The values the docs show for a platform, read from `@gpuixui/tokens` — the
 * docs carry no second copy of a family. Exported so a test can prove each
 * platform maps to its own package value without a browser.
 */
export const platformRows = (
  platform: PlatformName,
): ReadonlyArray<PlatformRow> => {
  const light = platformTheme(themes.light, platform);
  const dark = platformTheme(themes.dark, platform);
  return [
    { label: "Platform", value: platformTypes[platform].label },
    { label: "Theme name", value: `${light.name} / ${dark.name}` },
    { label: "UI face", value: light.typography.sans },
    { label: "Mono face", value: light.typography.mono },
    { label: "Code role", value: textStyle(light, "code").fontFamily },
  ];
};

/**
 * Live platform values on the Theming page. It is the visible proof that the
 * toggle changes a real theme rather than a docs-only stylesheet.
 */
export function PlatformValues() {
  const { platform } = usePlatform();
  const rows = platformRows(platform);
  const code = textStyle(platformTheme(themes.light, platform), "code");

  return (
    <div className="not-prose my-4 flex flex-col gap-3 rounded-md border border-fd-border bg-fd-card p-3">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-fd-muted-foreground">{row.label}</dt>
            <dd className="font-mono">{row.value}</dd>
          </div>
        ))}
      </dl>
      <pre className="overflow-x-auto rounded-md bg-fd-muted p-3 text-sm">
        <code style={{ fontFamily: code.fontFamily }}>
          {`const theme = platformTheme(themes.light, "${platform}");`}
        </code>
      </pre>
    </div>
  );
}
