/**
 * Hunter License — the Association's registry as a Mac app (plan 731).
 *
 * The directory in the source list (everyone, the star hunters, each
 * specialty), the chosen hunter's licence as the window's centrepiece — the
 * mark, the holder, the rank in stars, the licence number — and its privileges
 * as switches. Original artwork: the card is drawn from the theme's roles and
 * the owner's Gon mark; nothing is copied from the series.
 */
import { Avatar } from "@gpuixui/components/avatar";
import { InsetGroup, InsetGroupRow } from "@gpuixui/components/inset-group";
import { Icon } from "@gpuixui/icons";
import { Stack, Switch, Text } from "@gpuixui/primitives";
import { SourceList, Window, WindowToolbar } from "@gpuixui/shell";
import type { PlatformName } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useState } from "react";
import { MARK } from "../desktop/taskbar.js";
import { hunters, privileges, specialties, type Hunter } from "./data.js";
import { huntersIn, rankTitle, type Scope } from "./logic.js";

const isScope = (value: string): value is Scope =>
  value === "all" ||
  value === "stars" ||
  Arr.some(specialties, (specialty) => specialty === value);

/** The licence itself: a card the size of the real thing, scaled up. */
const LicenceCard = ({ hunter }: { readonly hunter: Hunter }) => {
  const theme = useTheme();
  const ink = theme.colors.background;
  return (
    <div
      testId="licence-card"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: 420,
        height: 264,
        padding: 22,
        borderRadius: 18,
        backgroundColor: theme.colors.foreground,
        boxShadow: {
          offsetX: 0,
          offsetY: 18,
          blurRadius: 40,
          spreadRadius: -12,
          color: "#00000059",
        },
      }}
    >
      <Stack
        direction="row"
        style={{ justifyContent: "space-between", alignItems: "center" }}
      >
        <Text role="caption" style={{ color: ink }}>
          HUNTER ASSOCIATION
        </Text>
        <img src={MARK} style={{ width: 34, height: 34 }} />
      </Stack>
      <Stack direction="row" gap="md" style={{ alignItems: "center" }}>
        <Avatar name={hunter.name} size="lg" />
        <Stack direction="column" gap="2xs">
          <Text role="h3" style={{ color: ink }} testId="licence-holder">
            {hunter.name}
          </Text>
          <Text role="caption" style={{ color: ink }}>
            {rankTitle(hunter)}
          </Text>
        </Stack>
      </Stack>
      <Stack
        direction="row"
        style={{ justifyContent: "space-between", alignItems: "flex-end" }}
      >
        <Stack direction="column" gap="2xs">
          <Text role="caption" style={{ color: ink }}>
            LICENCE
          </Text>
          <Text role="code" style={{ color: ink }}>
            {hunter.licence}
          </Text>
        </Stack>
        <Stack direction="row" gap="2xs" testId={`stars-${hunter.stars}`}>
          {Arr.map(Arr.range(1, 3), (n) => (
            <Icon
              key={n}
              name={n <= hunter.stars ? "star-filled" : "star"}
              size="md"
              color={n <= hunter.stars ? theme.colors.warning : ink}
            />
          ))}
        </Stack>
      </Stack>
    </div>
  );
};

/** The registry, as a whole native window. */
export const License = ({ platform }: { readonly platform?: PlatformName }) => {
  const theme = useTheme();
  const [scope, setScope] = useState<Scope>("all");
  const [chosen, setChosen] = useState("gon");
  const [granted, setGranted] = useState<ReadonlyArray<string>>([
    "restricted",
    "records",
    "transit",
  ]);
  const listed = huntersIn(hunters, scope);
  const hunter = Arr.findFirst(hunters, (h) => h.id === chosen);

  return (
    <Window
      testId="license"
      {...(platform === undefined ? {} : { platform })}
      sidebar={
        <SourceList
          label="Registry"
          value={scope}
          onValueChange={(next) => isScope(next) && setScope(next)}
          sections={[
            {
              id: "registry",
              items: [
                {
                  id: "all",
                  label: "All hunters",
                  icon: "user",
                  count: hunters.length,
                },
                {
                  id: "stars",
                  label: "Star hunters",
                  icon: "star",
                  count: huntersIn(hunters, "stars").length,
                },
              ],
            },
            {
              id: "specialties",
              title: "Specialties",
              items: Arr.map(specialties, (specialty) => ({
                id: specialty,
                label: specialty,
                icon: "badge-check" as const,
                count: huntersIn(hunters, specialty).length,
              })),
            },
          ]}
        />
      }
      toolbar={<WindowToolbar title="Hunter License" />}
      inspector={
        <Stack
          direction="column"
          gap="2xs"
          style={{ padding: theme.spacing.md }}
        >
          {Arr.map(listed, (h) => (
            <div
              key={h.id}
              testId={`hunter-${h.id}`}
              onClick={() => setChosen(h.id)}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                height: 40,
                paddingLeft: 8,
                paddingRight: 8,
                borderRadius: theme.radius.sm,
                ...(h.id === chosen
                  ? { backgroundColor: theme.colors.selected }
                  : {}),
              }}
            >
              <Avatar name={h.name} size="sm" />
              <Stack direction="column" style={{ flexGrow: 1, minWidth: 0 }}>
                <Text truncate>{h.name}</Text>
                <Text role="caption" tone="muted" truncate>
                  {rankTitle(h)}
                </Text>
              </Stack>
            </div>
          ))}
        </Stack>
      }
    >
      <Stack
        direction="column"
        gap="xl"
        style={{ flexGrow: 1, alignItems: "center", padding: theme.spacing.xl }}
      >
        {Option.match(hunter, {
          onNone: () => null,
          onSome: (holder) => <LicenceCard hunter={holder} />,
        })}
        <div style={{ width: 420 }}>
          <InsetGroup title="Privileges">
            {Arr.map(privileges, (privilege) => (
              <InsetGroupRow
                key={privilege.id}
                label={privilege.label}
                description={privilege.detail}
                control={
                  <Switch
                    label={privilege.label}
                    testId={`privilege-${privilege.id}`}
                    checked={granted.includes(privilege.id)}
                    onCheckedChange={(on) =>
                      setGranted(
                        on
                          ? Arr.append(granted, privilege.id)
                          : Arr.filter(granted, (id) => id !== privilege.id),
                      )
                    }
                  />
                }
              />
            ))}
          </InsetGroup>
        </div>
        {Option.match(hunter, {
          onNone: () => null,
          onSome: (holder) => (
            <Text tone="muted">{`Passed the ${holder.exam}th Hunter Exam · licensed since ${holder.since}`}</Text>
          ),
        })}
      </Stack>
    </Window>
  );
};
