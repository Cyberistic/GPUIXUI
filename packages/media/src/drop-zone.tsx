/** @jsxImportSource @gpuix/react */
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

export interface DropEntry {
  readonly path: string;
  readonly name: string;
}

export interface DropPayload {
  readonly files: ReadonlyArray<DropEntry>;
}

export interface DropZoneProps extends Omit<Props, "children"> {
  readonly label: string;

  readonly description?: string;

  readonly onDrop: (payload: DropPayload) => void;

  readonly onPick?: () => void;

  readonly pickLabel?: string;

  readonly disabled?: boolean;
  readonly className?: string;
}

const DEFAULT_LABEL = "Drop files";

const SEPARATORS = /[\\/]/;

const basename = (path: string): string =>
  Option.getOrElse(
    Arr.last(Arr.filter(Str.split(SEPARATORS)(path), Str.isNonEmpty)),
    () => path,
  );

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

export interface DropZoneSurface {
  readonly hovered: boolean;
  readonly onEnter: () => void;
  readonly onLeave: () => void;
}

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

  const highlighted = surface.hovered && !disabled;

  const name = accessibleName(label, DEFAULT_LABEL);
  const pick = accessibleName(pickLabel, "Choose files");

  const copy = visibleCopy(description);

  return (
    <div
      {...rest}
      role="group"
      aria-label={name}
      onMouseEnter={(event) => {
        if (!disabled) surface.onEnter();
        onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
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
      <text style={{ color: theme.colors.foreground }}>{name}</text>
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

export const DropZone = (props: DropZoneProps): ReactElement => {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);
  return renderDropZone(props, theme, {
    hovered,
    onEnter: () => setHovered(true),
    onLeave: () => setHovered(false),
  });
};
