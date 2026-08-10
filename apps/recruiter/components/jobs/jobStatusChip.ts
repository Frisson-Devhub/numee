import type { ChipVariant } from "@numee/shared/components";

/** Maps job lifecycle status to a shared Chip tone. */
export function jobStatusChipVariant(status?: string): ChipVariant {
  switch (status) {
    case "PUBLISHED":
      return "success";
    case "CLOSED":
      return "muted";
    default:
      return "accent";
  }
}
