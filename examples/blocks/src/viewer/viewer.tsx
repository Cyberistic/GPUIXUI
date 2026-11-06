import { Button, Stack, Text } from "@gpuixui/primitives";
import { SourceList, Window, WindowToolbar } from "@gpuixui/shell";
import { materialFill, seriesColors, type PlatformName } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import type { KeyEvent } from "@gpuix/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useState } from "react";
import { albums, photos } from "./data.js";
import { neighbour } from "./logic.js";

const Scene = ({
  sky,
  variant,
  width,
  height,
  radius,
}: {
  readonly sky: string;
  readonly variant: number;
  readonly width: number;
  readonly height: number;
  readonly radius: number;
}) => {
  const sun = Math.round(height * 0.22);
  const shape = (
    left: number,
    top: number,
    w: number,
    h: number,
    fill: string,
  ) => (
    <div
      style={{
        position: "absolute",
        left: Math.round(left),
        top: Math.round(top),
        width: Math.round(w),
        height: Math.round(h),
        borderRadius: 9999,
        backgroundColor: fill,
        pointerEvents: "none",
      }}
    />
  );
  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
        borderRadius: radius,
        backgroundColor: sky,
        pointerEvents: "none",
      }}
    >
      {shape(
        width * (0.15 + (variant % 3) * 0.25),
        height * 0.16,
        sun,
        sun,
        "#FFFFFFCC",
      )}
      {shape(
        -width * 0.2,
        height * 0.6,
        width * 0.9,
        height * 0.8,
        "#0000002E",
      )}
      {shape(
        width * (0.3 + (variant % 2) * 0.1),
        height * 0.68,
        width,
        height * 0.85,
        "#00000047",
      )}
    </div>
  );
};

export const Viewer = ({ platform }: { readonly platform?: PlatformName }) => {
  const theme = useTheme();
  const tints = seriesColors(theme);
  const [album, setAlbum] = useState<string>("arena");
  const [chosen, setChosen] = useState("p1");
  const [open, setOpen] = useState(false);
  const shown = Arr.filter(photos, (photo) => photo.album === album);
  const ids = Arr.map(shown, (photo) => photo.id);
  const current = Arr.findFirst(photos, (photo) => photo.id === chosen);

  const onKeyDown = (event: KeyEvent) => {
    if (event.key === "space") setOpen(!open);
    if (event.key === "escape") setOpen(false);
    if (event.key === "right" || event.key === "left")
      setChosen(neighbour(ids, chosen, event.key === "right" ? 1 : -1));
  };

  return (
    <Window
      testId="viewer"
      onKeyDown={onKeyDown}
      {...(platform === undefined ? {} : { platform })}
      sidebar={
        <SourceList
          label="Albums"
          value={album}
          onValueChange={setAlbum}
          sections={[
            {
              id: "albums",
              items: Arr.map(albums, (a) => ({
                id: a.id,
                label: a.label,
                icon: "image" as const,
              })),
            },
          ]}
        />
      }
      toolbar={
        <WindowToolbar
          title={albums.find((a) => a.id === album)?.label ?? ""}
        />
      }
    >
      {open && Option.isSome(current) ? (
        <div
          testId="open-photo"
          style={{
            position: "relative",
            display: "flex",
            flexGrow: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.background,
          }}
        >
          <Scene
            sky={tints[current.value.tint] ?? theme.colors.muted}
            variant={Number(current.value.id.slice(1))}
            width={760}
            height={500}
            radius={theme.radius.lg}
          />
          <Stack
            direction="row"
            gap="sm"
            testId="hud"
            style={{
              position: "absolute",
              bottom: 20,
              left: 0,
              width: "100%",
              justifyContent: "center",
            }}
          >
            <Stack
              direction="row"
              gap="sm"
              style={{
                alignItems: "center",
                padding: 6,
                borderRadius: 12,
                backgroundColor: materialFill(theme, "hud"),
              }}
            >
              <Button
                variant="ghost"
                size="sm"
                onActivate={() => setChosen(neighbour(ids, chosen, -1))}
              >
                ‹
              </Button>
              <Text>{current.value.caption}</Text>
              <Button
                variant="ghost"
                size="sm"
                onActivate={() => setChosen(neighbour(ids, chosen, 1))}
              >
                ›
              </Button>
              <Button
                variant="ghost"
                size="sm"
                testId="close"
                onActivate={() => setOpen(false)}
              >
                Close
              </Button>
            </Stack>
          </Stack>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
            padding: theme.spacing.lg,
          }}
        >
          {Arr.map(shown, (photo) => (
            <div
              key={photo.id}
              testId={`photo-${photo.id}`}
              onClick={() => {
                setChosen(photo.id);
                setOpen(true);
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                width: 160,
              }}
            >
              {}
              <div
                style={{
                  borderRadius: theme.radius.md,
                  pointerEvents: "none",
                  ...(photo.id === chosen
                    ? { borderWidth: 3, borderColor: theme.colors.primary }
                    : {}),
                }}
              >
                <Scene
                  sky={tints[photo.tint] ?? theme.colors.muted}
                  variant={Number(photo.id.slice(1))}
                  width={160}
                  height={110}
                  radius={theme.radius.md}
                />
              </div>
              <Text tone="muted">{photo.caption}</Text>
            </div>
          ))}
        </div>
      )}
    </Window>
  );
};
