/**
 * Viewer — a media viewer with a floating HUD (plan 729): albums in the source
 * list, a grid of the album, and the chosen photo full-size with a HUD bar of
 * ‹ › and the caption on the `hud` material. Space toggles the open photo, the
 * Quick Look habit; Escape closes it.
 */
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
            flexGrow: 1,
            backgroundColor: tints[current.value.tint],
          }}
        >
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
              <div
                style={{
                  height: 110,
                  // The swatch is a picture, not a target: the press is the
                  // thumbnail's, which a hit on this box would not reach.
                  pointerEvents: "none",
                  borderRadius: theme.radius.md,
                  backgroundColor: tints[photo.tint],
                  ...(photo.id === chosen
                    ? { borderWidth: 3, borderColor: theme.colors.primary }
                    : {}),
                }}
              />
              <Text tone="muted">{photo.caption}</Text>
            </div>
          ))}
        </div>
      )}
    </Window>
  );
};
