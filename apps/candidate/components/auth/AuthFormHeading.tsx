export function AuthFormHeading({
  title,
  subtitle,
  dark = false,
}: {
  title: string;
  subtitle?: string;
  dark?: boolean;
}) {
  return (
    <div>
      <h2 className={`text-2xl sm:text-3xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>{title}</h2>
      {subtitle && <p className={`${dark ? "text-gray-300" : "text-gray-600"} mt-1 text-sm pb-5`}>{subtitle}</p>}
    </div>
  );
}
