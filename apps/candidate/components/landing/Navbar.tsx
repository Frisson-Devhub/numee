"use client";

import Link from "next/link";
import { useI18n } from "@/contexts/I18nContext";
import { BarsIcon } from "./icons";

const SURVEY_URL =
  "https://forms.office.com/Pages/ResponsePage.aspx?id=BZHu2AqWVE2tRLJb87b-COreJ2KFeKVEjHmeEfR0obBUQzM4TDFYUlY3UzRYQTNFSUFIMkdYUlRGQyQlQCN0PWcu";

const navItems = [
  { href: "#aboutus", key: "about" as const },
  { href: "#whyus", key: "whyUs" as const },
  { href: "#features", key: "features" as const },
  { href: "#survey", key: "survey" as const },
  { href: "#testimonials", key: "testimonials" as const },
  { href: "#/", key: "contact" as const, modal: true },
];

export default function Navbar() {
  const { t } = useI18n();

  return (
    <header className="header">
      <nav className="navbar navbar-expand-lg navbar-light">
        <div className="container-fluid">
          <Link className="navbar-brand" href="/">
            <img src="/assets/img/logo.svg" alt="NuMee Logo" title="NuMee - Your Personal Mentor" height={50} />
          </Link>

          {/* Mobile: Survey + hamburger (callnumee.com) */}
          <div className="landing-mobile-nav d-flex d-lg-none align-items-center gap-4 ms-auto">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.open(SURVEY_URL, "_blank")}
            >
              {t("landing.nav.survey")}
            </button>
            <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarNav"
              aria-controls="navbarNav"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <BarsIcon />
            </button>
          </div>

          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              {navItems.map(({ href, key, modal }) => (
                <li className="nav-item" key={key}>
                  {modal ? (
                    <a className="nav-link" href={href} data-bs-toggle="modal" data-bs-target="#joinwaitlist">
                      {t(`landing.nav.${key}`)}
                    </a>
                  ) : (
                    <a className="nav-link" href={href}>
                      {t(`landing.nav.${key}`)}
                    </a>
                  )}
                </li>
              ))}
            </ul>
            <Link href="/login" className="btn btn-primary landing-login-btn">
              {t("landing.nav.login")}
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
