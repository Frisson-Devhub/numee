export function LandingStyles() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
      />
      <link rel="stylesheet" href="/assets/css/bootstrap.min.css" precedence="default" />
      <link rel="stylesheet" href="/assets/css/style.css" precedence="default" />
      <link rel="stylesheet" href="/assets/css/responsive.css" precedence="default" />
      <link rel="stylesheet" href="/assets/css/overrides.css" precedence="default" />
      <style
        dangerouslySetInnerHTML={{
          __html: "body{background:#fff;color:#000}.wrapper{background:#fff;color:#000}",
        }}
      />
    </>
  );
}
