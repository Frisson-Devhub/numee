/**
 * Consistent auth form title block — tracking and weight tuned for Plus Jakarta Sans.
 * Use `dark` only on branding panels; form columns stay ink-on-mist via token classes.
 */
export function AuthFormHeading({
  title,
  subtitle,
  dark = false,
}: {
  title: string;
  subtitle?: string;
  /** When true, uses panel-on-dark tokens (never bare white that can clash). */
  dark?: boolean;
}) {
  return (
    <div className="space-y-2">
      <h2
        className={`text-2xl font-semibold tracking-tight sm:text-[1.75rem] ${
          dark ? "text-auth-on-panel" : "text-foreground"
        }`}
      >
        {title}
      </h2>
      {subtitle ? (
        <p
          className={`max-w-sm text-sm leading-relaxed ${
            dark ? "text-auth-on-panel-muted" : "text-foreground-muted"
          }`}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
