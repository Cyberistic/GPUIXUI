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
import { visibleCopy } from "@gpuixui/primitives/core";
import { cn } from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useState, type ReactElement } from "react";
import { recipeStyle, useTheme, type Theme } from "./internal.js";
import { accessibleName } from "./name.js";

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
  /** Why the reader should drop or pick here. A blank one paints no line. */
  readonly description?: string;
  /** Called with the dropped files, in drop order. */
  readonly onDrop: (payload: DropPayload) => void;
  /** The caller's file picker, wired to the pick button. Omit for no button. */
  readonly onPick?: () => void;
  /** The pick button's label. Default `"Choose files"`. */
  readonly pickLabel?: string;
  /** Refuse drops and the pick; the zone paints at rest, without the highlight. */
  readonly disabled?: boolean;
  readonly className?: string;
}

/** Both separators: a drop on Windows arrives as `C:\Users\ada\notes.txt`. */
const SEPARATORS = /[\\/]/;

const basename = (path: string): string =>
  Option.getOrElse(
    Arr.last(Arr.filter(Str.split(SEPARATORS)(path), Str.isNonEmpty)),
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
    pickLabel,
    disabled = false,
    className,
    style,
    onMouseEnter,
    onMouseLeave,
    onFileDrop,
    ...rest
  } = props;
  // A zone that refuses a drop must not advertise one: the highlight is the
  // promise of an action, so a disabled zone paints at rest even while the
  // wrapper still holds the last hover flag.
  const highlighted = surface.hovered && !disabled;
  const pick = accessibleName(pickLabel, "Choose files");
  // A description is copy like a name: a blank one paints a full blank line
  // under the zone's label (`visibleCopy`), so a key an i18n table never filled
  // leaves the zone's spacing alone instead of adding a line that says nothing.
  const copy = visibleCopy(description);

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
        // Always clear: a pointer that leaves during the disabled window would
        // otherwise leave the flag set for a zone re-enabled later.
        surface.onLeave();
        onMouseLeave?.(event);
      }}
      onFileDrop={(event) => {
        if (!disabled) onDrop({ files: dropEntries(event.paths ?? []) });
        onFileDrop?.(event);
      }}
      style={mergeStyles(
        mergeStyles(
          recipeStyle(cn("rounded-lg", className), theme),
          zoneStyle(theme, highlighted),
        ),
        style,
      )}
    >
      <Icon name="upload" color={theme.colors.mutedForeground} />
      <text style={{ color: theme.colors.foreground }}>{label}</text>
      {copy === undefined ? null : (
        <text style={{ color: theme.colors.mutedForeground }}>{copy}</text>
      )}
      {onPick === undefined ? null : (
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled}
          testId="drop-zone-pick"
          onActivate={() => onPick()}
        >
          {pick}
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
