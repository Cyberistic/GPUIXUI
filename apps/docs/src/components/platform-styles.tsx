import {
  platformTheme,
  platformTypes,
  themes,
  type Theme,
} from "@gpuixui/tokens";
import { STYLE_GROUPS, styleDiff, type StyleDiff } from "@/lib/platform-styles";
import { platformNames } from "@/lib/token-catalogue";
import { usePlatform } from "@/platform/platform-provider";

export interface PlatformStyle {
  readonly platform: (typeof platformNames)[number];
  readonly label: string;
  readonly name: string;
  readonly diffs: ReadonlyArray<StyleDiff>;
}

/**
 * One row set per shipped platform style, compared with the **default platform
 * style** rather than the host's base theme: the default style names Menlo, so
 * the table reads the same on every build host. Exported so a test proves the
 * package values reach the table without a browser. The comparison takes the two
 * themes, so the tokens workstream can replace `platformTheme` with a full style
 * without changing this module's contract.
 */
export const platformStyles = (
  base: Theme = platformTheme(themes.light, "default"),
): ReadonlyArray<PlatformStyle> =>
  platformNames.map((platform) => {
    const applied = platformTheme(themes.light, platform);
    return {
      platform,
      label: platformTypes[platform].label,
      name: applied.name,
      diffs: styleDiff(base, applied),
    };
  });

/**
 * What each platform style actually changes, generated from the package. A
 * reader sees the real difference instead of a remembered sentence, and the
 * table fills in when a platform style grows.
 */
export function PlatformStyles() {
  const { platform: active } = usePlatform();
  const styles = platformStyles();

  return (
    <div className="not-prose my-4 overflow-x-auto rounded-md border border-fd-border bg-fd-card">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">
          The fields each shipped platform style changes from the default light
          theme.
        </caption>
        <thead>
          <tr className="border-b border-fd-border">
            <th scope="col" className="p-2 font-medium">
              Field
            </th>
            {styles.map((style) => (
              <th
                key={style.platform}
                scope="col"
                data-active={style.platform === active}
                className="p-2 font-medium data-[active=true]:text-fd-primary"
              >
                {style.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-fd-border/50">
            <th
              scope="row"
              className="p-2 font-normal text-fd-muted-foreground"
            >
              Theme name
            </th>
            {styles.map((style) => (
              <td
                key={style.platform}
                data-platform={style.platform}
                className="p-2 font-mono text-xs"
              >
                {style.name}
              </td>
            ))}
          </tr>
          {STYLE_GROUPS.map((group) => (
            <tr
              key={group.key}
              className="border-b border-fd-border/50 last:border-0"
            >
              <th
                scope="row"
                className="p-2 font-normal text-fd-muted-foreground"
              >
                {group.label}
              </th>
              {styles.map((style) => {
                const detail =
                  style.diffs.find((diff) => diff.label === group.label)
                    ?.detail ?? "same";
                return (
                  <td
                    key={style.platform}
                    data-platform={style.platform}
                    className={
                      detail === "same"
                        ? "p-2 font-mono text-xs text-fd-muted-foreground"
                        : "p-2 font-mono text-xs"
                    }
                  >
                    {detail}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
