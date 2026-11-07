/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import type { ReactNode } from "react";
import {
  Button as PrimitiveButton,
  IconButton as PrimitiveIconButton,
  actionOnColor as primitiveActionOnColor,
  type ButtonVariant as PrimitiveVariant,
} from "@gpuixui/primitives/button";
import { cn } from "@gpuixui/tw";
import * as Schema from "effect/Schema";
import type { Theme } from "./theme.js";

const ButtonVariants = Schema.Literals([
  "primary",
  "secondary",
  "ghost",
  "danger",
  "link",
]);

export type ButtonVariant = typeof ButtonVariants.Type;

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Props {
  readonly variant?: ButtonVariant;

  readonly size?: ButtonSize;

  readonly disabled?: boolean;

  readonly loading?: boolean;

  readonly loadingLabel?: string;

  readonly reducedMotion?: boolean;

  readonly leading?: ReactNode;

  readonly trailing?: ReactNode;
}

export interface IconButtonProps extends Props {
  readonly label: string;

  readonly size?: ButtonSize;
  readonly disabled?: boolean;
}

interface Look {
  readonly variant: PrimitiveVariant;
  readonly className: string;
}

const LOOKS: Readonly<Record<ButtonVariant, Look>> = {
  primary: { variant: "primary", className: "" },
  secondary: { variant: "secondary", className: "border border-strong" },
  ghost: { variant: "ghost", className: "" },
  danger: { variant: "destructive", className: "" },

  link: { variant: "link", className: "underline underline-offset-4" },
};

const lookOf = (variant: unknown): Look =>
  LOOKS[Schema.is(ButtonVariants)(variant) ? variant : "secondary"];

export const actionOnColor = (theme: Theme, variant: ButtonVariant): string =>
  primitiveActionOnColor(theme, lookOf(variant).variant);

export const Button = ({
  variant = "secondary",
  size = "md",
  disabled = false,
  onClick,
  style,
  "aria-label": ariaLabel,
  ...rest
}: ButtonProps) => {
  const look = lookOf(variant);
  return (
    <PrimitiveButton
      {...rest}
      variant={look.variant}
      size={size}
      disabled={disabled}
      label={ariaLabel}
      className={cn(look.className)}
      onActivate={onClick}
      style={style}
    />
  );
};

export const IconButton = ({
  label,
  size = "md",
  disabled = false,
  onClick,
  style,
  children,
  ...rest
}: IconButtonProps) => (
  <PrimitiveIconButton
    {...rest}
    icon={children}
    variant="ghost"
    size={size}
    disabled={disabled}
    label={label}
    className="text-muted-foreground hover:text-foreground"
    onActivate={onClick}
    style={style}
  />
);
