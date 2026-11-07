import { statusTone, type Theme } from "@gpuixui/tokens";

export const EMPTY_ERROR_STAGES = ["error", "empty", "ready"] as const;

export type EmptyErrorStage = (typeof EMPTY_ERROR_STAGES)[number];

export const EMPTY_ERROR_IDS = {
  probe: "empty-error-probe",
  stage: "empty-error-stage",
  readout: "empty-error-readout",
  alert: "empty-error-alert",
  retry: "empty-error-retry",
  empty: "empty-error-empty",
  newProject: "empty-error-new-project",
  content: "empty-error-content",
} as const;

export const EMPTY_ERROR_COPY = {
  alertTitle: "Could not load projects",
  alertBody: "The server did not answer. The list is unchanged.",
  retry: "Retry",
  emptyTitle: "No projects yet",
  emptyBody: "A project holds your files, runs and settings.",
  newProject: "New project",
  content: "First project",
} as const;

export const EMPTY_ERROR_FRAMES = {
  error: "empty-error-error",
  empty: "empty-error-empty",
  ready: "empty-error-ready",
} as const;

export const EMPTY_ERROR_WIDTH = 420;

export const PAINT_INSET = 6;

export const EMPTY_INSET = 8;

export const stagePaint = (theme: Theme): string => theme.colors.popover;

export const errorSurfacePaint = (theme: Theme): string =>
  statusTone(theme, "destructive").background;

export const errorInkPaint = (theme: Theme): string =>
  statusTone(theme, "destructive").foreground;

export const actionPaint = (theme: Theme): string => theme.colors.primary;

export const contentPaint = (theme: Theme): string => theme.colors.success;

export const inside = (
  box: { readonly x: number; readonly y: number },
  dx: number,
  dy: number,
): { readonly x: number; readonly y: number } => ({
  x: box.x + dx,
  y: box.y + dy,
});

export const emptyErrorReadout = (stage: EmptyErrorStage): string =>
  `state=${stage}`;

export const afterAction = (stage: EmptyErrorStage): EmptyErrorStage =>
  stage === "error" ? "empty" : "ready";

export const EMPTY_ERROR_CHECKS = 33;
