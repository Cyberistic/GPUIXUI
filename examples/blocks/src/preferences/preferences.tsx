import { InsetGroup, InsetGroupRow } from "@gpuixui/components/inset-group";
import { SearchInput } from "@gpuixui/components/search-input";
import { SegmentedControl } from "@gpuixui/components/segmented-control";
import { Select, Stack, Switch, Text } from "@gpuixui/primitives";
import { SourceList, Window, WindowToolbar } from "@gpuixui/shell";
import type { PlatformName } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useState } from "react";
import { panes } from "./data.js";
import { panesMatching } from "./logic.js";

export const Preferences = ({
  platform,
}: {
  readonly platform?: PlatformName;
}) => {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [pane, setPane] = useState("notifications");
  const [previews, setPreviews] = useState(true);
  const [badge, setBadge] = useState(false);
  const [style, setStyle] = useState("banners");
  const shown = panesMatching(panes, query);
  const title = Option.match(
    Arr.findFirst(panes, (entry) => entry.id === pane),
    { onNone: () => "", onSome: (entry) => entry.label },
  );

  return (
    <Window
      testId="preferences"
      {...(platform === undefined ? {} : { platform })}
      sidebar={
        <Stack direction="column" gap="sm">
          <div style={{ paddingLeft: 10, paddingRight: 10 }}>
            <SearchInput
              testId="pane-search"
              value={query}
              onValueChange={setQuery}
              placeholder="Search"
            />
          </div>
          <SourceList
            label="Settings"
            value={pane}
            onValueChange={setPane}
            sections={Arr.map(["Account", "System"] as const, (group) => ({
              id: group,
              items: Arr.map(
                Arr.filter(shown, (entry) => entry.group === group),
                (entry) => ({
                  id: entry.id,
                  label: entry.label,
                  icon: entry.icon,
                }),
              ),
            }))}
          />
        </Stack>
      }
      toolbar={<WindowToolbar title={title} />}
    >
      <Stack
        direction="column"
        gap="lg"
        style={{ padding: theme.spacing.xl, maxWidth: 520 }}
      >
        <InsetGroup title="Ging Freecss's devices">
          <InsetGroupRow
            label="Show previews"
            description="Message text on the lock screen"
            control={
              <Switch
                label="Show previews"
                testId="previews"
                checked={previews}
                onCheckedChange={setPreviews}
              />
            }
          />
          <InsetGroupRow
            label="Badge app icon"
            control={
              <Switch
                label="Badge app icon"
                checked={badge}
                onCheckedChange={setBadge}
              />
            }
          />
          <InsetGroupRow
            label="Alert style"
            control={
              <SegmentedControl
                label="Alert style"
                value={style}
                onValueChange={setStyle}
                items={[
                  { value: "none", label: "None" },
                  { value: "banners", label: "Banners" },
                  { value: "alerts", label: "Alerts" },
                ]}
              />
            }
          />
          <InsetGroupRow
            label="Group notifications"
            control={
              <Select
                label="Group notifications"
                size="sm"
                defaultValue="app"
                options={[
                  { value: "auto", label: "Automatically" },
                  { value: "app", label: "By app" },
                  { value: "off", label: "Off" },
                ]}
              />
            }
          />
        </InsetGroup>
        <Text tone="muted">
          {previews
            ? "Previews show on the lock screen."
            : "Previews are hidden."}
        </Text>
      </Stack>
    </Window>
  );
};
