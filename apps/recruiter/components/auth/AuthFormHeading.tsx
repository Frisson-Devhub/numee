export function AuthFormHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{title}</h2>
      {subtitle && (
        <p className="text-foreground-muted mt-1 text-sm pb-5">{subtitle}</p>
      )}
    </div>
  );
}
