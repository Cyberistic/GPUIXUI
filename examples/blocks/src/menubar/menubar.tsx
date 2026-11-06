import {
  Button,
  Progress,
  Separator,
  Stack,
  Switch,
  Text,
} from "@gpuixui/primitives";
import { materialFill } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import { useState } from "react";
import { syncProgress, watches } from "./data.js";
import { statusLine, toggle } from "./logic.js";

// TODO: anchor to a status item once plans 702 (tray) and 706 land.
export const MenuBar = () => {
  const theme = useTheme();
  const [all, setAll] = useState(watches);
  return (
    <div
      style={{
        display: "flex",
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        backgroundColor: theme.colors.muted,
      }}
    >
      <Stack
        direction="column"
        gap="sm"
        testId="menubar"
        style={{
          width: 320,
          padding: theme.spacing.md,
          borderRadius: 10,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
          backgroundColor: materialFill(theme, "popover"),
        }}
      >
        <Text role="bodyStrong">Killua&apos;s monitor</Text>
        <div testId="status" aria-label={statusLine(all)}>
          <Text tone="muted">{statusLine(all)}</Text>
        </div>
        <Separator orientation="horizontal" />
        {Arr.map(all, (watch) => (
          <Stack
            key={watch.id}
            direction="row"
            style={{
              alignItems: "center",
              justifyContent: "space-between",
              height: 28,
            }}
          >
            <Text>{watch.label}</Text>
            <Switch
              label={watch.label}
              testId={`watch-${watch.id}`}
              checked={watch.on}
              onCheckedChange={() => setAll(toggle(all, watch.id))}
            />
          </Stack>
        ))}
        <Separator orientation="horizontal" />
        <Text tone="muted">Syncing the binder</Text>
        <Progress value={syncProgress * 100} label="Sync" />
        <Separator orientation="horizontal" />
        <Stack direction="row" style={{ justifyContent: "space-between" }}>
          <Button variant="ghost" size="sm">
            Settings…
          </Button>
          <Button variant="ghost" size="sm">
            Quit
          </Button>
        </Stack>
      </Stack>
    </div>
  );
};
