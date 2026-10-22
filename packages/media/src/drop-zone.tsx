/**
 * `DropZone`: a labelled area that accepts an OS file drop and offers a pick.
 *
 * The drop rides the runtime's `onFileDrop` (the `FileDrop::Entered` then
 * `Submit` pair a Finder drag produces), whose payload is absolute paths — so
 * the zone maps paths to `{ name, path }` entries and reports `{ files }` to
 * `onDrop`. The runtime exposes **no drag-enter/drag-over event and no drag
 * preview** (no drag image, no cross-application payload), so the "highlight
 * while a drag is over it" is the pointer-over wash (`onMouseEnter`/`onMouseLeave`)
 * — the closest honest signal the host gives — and the **pick** action is the
 * reliable route on a host with no drop event. The picker is the caller's
 * (`onPick`, e.g. `GpuixRenderer.promptForPaths`), because the package owns no
 * network and no platform prompt.
 */

import type { Props, StyleDesc } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import { Button } from "@gpuixui/primitives/button";
import { cn } from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useState, type ReactElement } from "react";
import { recipeStyle, useTheme, type Theme } from "./internal.js";

/** One dropped file, derived from an absolute path. */
export interface DropEntry {
  readonly path: string;
  readonly name: string;
}

/** What `onDrop` reports. */
export interface DropPayload {
  readonly files: ReadonlyArray<DropEntry>;
}

/** {@link DropZone} props. */
export interface DropZoneProps extends Omit<Props, "children"> {
  /** The zone's visible and accessible name. */
  readonly label: string;
  /** Why the reader should drop or pick here. */
  readonly description?: string;
  /** Called with the dropped files, in drop order. */
  readonly onDrop: (payload: DropPayload) => void;
  /** The caller's file picker, wired to the pick button. Omit for no button. */
  readonly onPick?: () => void;
  /** The pick button's label. Default `"Choose files"`. */
  readonly pickLabel?: string;
  /** Refuse drops and the pick; the zone stays a painted region. */
  readonly disabled?: boolean;
  readonly className?: string;
}

const basename = (path: string): string =>
  Option.getOrElse(
    Arr.last(Arr.filter(Str.split("/")(path), Str.isNonEmpty)),
    () => path,
  );

/** Map an OS drop's absolute paths to `{ name, path }` entries. */
export const dropEntries = (
  paths: ReadonlyArray<string>,
): ReadonlyArray<DropEntry> =>
  Arr.map(paths, (path) => ({ path, name: basename(path) }));

const zoneStyle = (theme: Theme, hovered: boolean): StyleDesc => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: theme.spacing.sm,
  padding: theme.spacing.xl,
  borderWidth: hovered ? theme.borderWidth.strong : theme.borderWidth.thin,
  borderStyle: "dashed",
  borderColor: hovered ? theme.colors.ring : theme.colors.borderStrong,
  backgroundColor: hovered ? theme.colors.accent : theme.colors.muted,
});

/** The pointer state the highlight reads; owned by the React wrapper. */
export interface DropZoneSurface {
  readonly hovered: boolean;
  readonly onEnter: () => void;
  readonly onLeave: () => void;
}

/** The element `DropZone` renders. Pure in its arguments. */
export const renderDropZone = (
  props: DropZoneProps,
  theme: Theme,
  surface: DropZoneSurface,
): ReactElement => {
  const {
    label,
    description,
    onDrop,
    onPick,
    pickLabel = "Choose files",
    disabled = false,
    className,
    style,
    onMouseEnter,
    onMouseLeave,
    onFileDrop,
    ...rest
  } = props;

  return (
    <div
      {...rest}
      role="group"
      aria-label={label}
      onMouseEnter={(event) => {
        if (!disabled) surface.onEnter();
        onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        if (!disabled) surface.onLeave();
        onMouseLeave?.(event);
      }}
      onFileDrop={(event) => {
        if (!disabled) onDrop({ files: dropEntries(event.paths ?? []) });
        onFileDrop?.(event);
      }}
      style={mergeStyles(
        mergeStyles(
          recipeStyle(cn("rounded-lg", className), theme),
          zoneStyle(theme, surface.hovered),
        ),
        style,
      )}
    >
      <Icon name="upload" color={theme.colors.mutedForeground} />
      <text style={{ color: theme.colors.foreground }}>{label}</text>
      {description === undefined ? null : (
        <text style={{ color: theme.colors.mutedForeground }}>
          {description}
        </text>
      )}
      {onPick === undefined ? null : (
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled}
          testId="drop-zone-pick"
          onActivate={() => onPick()}
        >
          {pickLabel}
        </Button>
      )}
    </div>
  );
};

/** A labelled drop target with a pointer highlight and a pick action. */
export const DropZone = (props: DropZoneProps): ReactElement => {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);
  return renderDropZone(props, theme, {
    hovered,
    onEnter: () => setHovered(true),
    onLeave: () => setHovered(false),
  });
};
