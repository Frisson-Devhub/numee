import { Chip, type ChipVariant } from "@numee/shared/components";

/** Candidate-facing label: published jobs show as Active. */
export function jobStatusTagLabel(status?: string): string {
  return status === "CLOSED" ? "Closed" : "Active";
}

/** Maps job lifecycle status to a shared Chip tone. */
export function jobStatusTagVariant(status?: string): ChipVariant {
  return status === "CLOSED" ? "muted" : "success";
}

export function JobStatusTag({
  status,
  className,
}: {
  status?: string;
  className?: string;
}) {
  return (
    <Chip size="sm" variant={jobStatusTagVariant(status)} className={className}>
      {jobStatusTagLabel(status)}
    </Chip>
  );
}
