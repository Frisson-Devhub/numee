const LANDING_STYLESHEETS = [
  "/assets/css/bootstrap.min.css",
  "/assets/css/style.css",
  "/assets/css/responsive.css",
  "/assets/css/overrides.css",
];

/**
 * Legacy callnumee stylesheets, scoped to the landing segment.
 *
 * Deliberately plain `<link>` tags with no `precedence` and no CSS `import`: both of
 * those routes make the stylesheet a cached document resource that React/Next never
 * remove, so Bootstrap's resets leaked into every client-side navigation target
 * (`/login` rendered in Poppins with dark panel text until a hard reload). Without
 * `precedence`, React ties each tag to this component and drops it on unmount.
 */
export function LandingStyles() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
      />
      {LANDING_STYLESHEETS.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      <style
        dangerouslySetInnerHTML={{
          __html: "body{background:#fff;color:#000}.wrapper{background:#fff;color:#000}",
        }}
      />
    </>
  );
}
