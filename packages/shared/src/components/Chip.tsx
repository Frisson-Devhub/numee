import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { twMerge } from "tailwind-merge";

const sizeClasses = {
  sm: "min-h-6 gap-1 px-2 py-0.5 text-xs",
  md: "min-h-7 gap-1.5 px-2.5 py-1 text-sm",
} as const;

const variantClasses = {
  /** Soft surface tag — skill lists, counts, quiet labels. */
  neutral: "border-border-soft bg-surface-muted text-foreground",
  /** Brand-tinted tag — selected skills, portal-accent cohesion. */
  brand: "border-brand-primary/20 bg-brand-primary/[0.1] text-brand-primary",
  /** Bordered idle control — filter chips before selection. */
  outline: "border-border-default bg-surface text-foreground-muted",
  /** Filled brand control — active filter / selected state. */
  solid: "border-transparent bg-brand-primary text-on-brand",
  /** Semantic success — published / positive status. */
  success: "border-success/20 bg-success/10 text-success",
  /** Warm accent — draft / attention status. */
  accent: "border-brand-accent/20 bg-brand-accent/10 text-brand-accent",
  /** Low-emphasis status — closed / inactive. */
  muted: "border-foreground-subtle/20 bg-foreground-subtle/10 text-foreground-subtle",
} as const;

const interactiveHoverClasses = {
  neutral: "hover:border-border-default hover:bg-surface-subtle",
  brand: "hover:border-brand-primary/35 hover:bg-brand-primary/[0.14]",
  outline:
    "hover:border-border-strong hover:bg-surface-muted hover:text-foreground",
  solid: "hover:bg-brand-primary-bright",
  success: "hover:bg-success/[0.14]",
  accent: "hover:bg-brand-accent/[0.14]",
  muted: "hover:bg-foreground-subtle/[0.14]",
} as const;

export type ChipSize = keyof typeof sizeClasses;
export type ChipVariant = keyof typeof variantClasses;

type ChipCommonProps = {
  children: ReactNode;
  size?: ChipSize;
  /** Visual tone; use `selected` on interactive chips to flip to `solid`. */
  variant?: ChipVariant;
  /** When true, forces the solid brand look (filter / toggle chips). */
  selected?: boolean;
  /** Shows a dismiss control; keep behavior in the parent handler. */
  onDismiss?: () => void;
  /** Accessible label for the dismiss control (defaults to “Remove”). */
  dismissLabel?: string;
  disabled?: boolean;
  className?: string;
};

type ChipButtonProps = ChipCommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ChipCommonProps | "type"> & {
    onClick: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
  };

type ChipSpanProps = ChipCommonProps &
  Omit<HTMLAttributes<HTMLSpanElement>, keyof ChipCommonProps> & {
    onClick?: undefined;
  };

export type ChipProps = ChipButtonProps | ChipSpanProps;

function DismissIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      fill="none"
      className={className}
    >
      <path
        d="M3 3l6 6M9 3L3 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Compact tag / filter / status chip. Uses brand and semantic tokens so portal
 * scopes (e.g. recruiter teal) recolor without ad-hoc hex. Interactive when
 * `onClick` is set; optional `onDismiss` for removable tags.
 */
export function Chip(props: ChipProps) {
  const {
    children,
    size = "md",
    variant = "neutral",
    selected = false,
    onDismiss,
    dismissLabel = "Remove",
    disabled = false,
    className = "",
    onClick,
    ...rest
  } = props;

  const tone = selected ? "solid" : variant;
  const interactive = typeof onClick === "function";

  const classes = twMerge(
    "inline-flex max-w-full items-center rounded-md border font-medium leading-none tracking-tight transition-[color,background-color,border-color,box-shadow] duration-150",
    sizeClasses[size],
    variantClasses[tone],
    interactive && interactiveHoverClasses[tone],
    interactive &&
      "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
    disabled && "pointer-events-none opacity-60",
    className,
  );

  const content = (
    <>
      <span className="min-w-0 truncate">{children}</span>
      {onDismiss && !disabled ? (
        <button
          type="button"
          aria-label={dismissLabel}
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className={twMerge(
            "inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-current/65 transition-colors",
            "hover:bg-current/10 hover:text-current",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1 focus-visible:ring-offset-transparent",
            tone === "solid" && "hover:bg-on-brand/15 hover:text-on-brand",
          )}
        >
          <DismissIcon className="size-3" />
        </button>
      ) : null}
    </>
  );

  if (interactive) {
    const buttonRest = rest as Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      keyof ChipCommonProps | "type"
    >;
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={classes}
        {...buttonRest}
      >
        {content}
      </button>
    );
  }

  const spanRest = rest as Omit<
    HTMLAttributes<HTMLSpanElement>,
    keyof ChipCommonProps
  >;
  return (
    <span className={classes} {...spanRest}>
      {content}
    </span>
  );
}
