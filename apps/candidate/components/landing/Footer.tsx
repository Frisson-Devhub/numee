"use client";

import Link from "next/link";
import { useI18n } from "@/contexts/I18nContext";
import { PaperPlaneIcon } from "./icons";

const FOOTER_LINKS = [
  { key: "aboutUs", href: "#aboutus" },
  { key: "whyUs", href: "#whyus", nav: true },
  { key: "features", href: "#features", nav: true },
  { key: "survey", href: "#survey", nav: true },
  { key: "testimonials", href: "#testimonials" },
] as const;

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="footer bg-blue">
      <div className="main-info">
        <div className="container">
          <div className="row">
            <div className="col-xl-4 col-lg-5 col-md-5 col-sm-12 col-12">
              <div className="f-shrt-info padd60">
                <Link href="/">
                  <img src="/assets/img/logo.svg" className="img-fluid" alt="NuMee Logo" height={40} />
                </Link>
                <p className="mb-lg-5 mb-md-4 mb-sm-4 mb-4 mt-4 pe-md-4">
                  {t("landing.footer.tagline")}
                </p>
                <ul className="follow-me d-flex align-items-center justify-content-start gap-2">
                  <li>
                    <a href="https://x.com/numee_ypm" target="_blank" rel="noopener noreferrer">
                      <img src="/assets/img/twitter.svg" className="img-fluid" alt="Twitter" />
                    </a>
                  </li>
                  <li>
                    <a href="https://www.linkedin.com/company/numee-ai" target="_blank" rel="noopener noreferrer">
                      <img src="/assets/img/linkedin.svg" className="img-fluid" alt="Linkedin" />
                    </a>
                  </li>
                  <li>
                    <a href="https://www.instagram.com/numee.ypm" target="_blank" rel="noopener noreferrer">
                      <img src="/assets/img/instagram.svg" className="img-fluid" alt="Instagram" />
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="col-xl-8 col-lg-7 col-md-7 col-sm-12 col-12">
              <div className="f-links padd60 ms-xl-5 ms-lg-0 ms-md-0 ms-sm-0 ms-0">
                <div className="row g-4">
                  <div className="col-xl-6 col-lg-5 col-md-5 col-sm-4 col-6">
                    <div className="f-link ps-xxl-5 ps-xl-5 ps-lg-4 ps-md-0 ps-sm-0 ps-0">
                      <h4 className="mb-4 pb-2 text-white">{t("landing.footer.company")}</h4>
                      <ul>
                        {FOOTER_LINKS.map((link) => (
                          <li key={link.key}>
                            <a href={link.href}>
                              {"nav" in link ? t(`landing.nav.${link.key}`) : t(`landing.footerLinks.${link.key}`)}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="col-xl-6 col-lg-7 col-md-7 col-sm-8 col-12">
                    <div className="f-link mt-md-0 mt-sm-0 mt-3">
                      <h4 className="mb-4 pb-2 text-white">{t("landing.footer.newsletterTitle")}</h4>
                      <div className="newsletter">
                        <p className="mb-3">{t("landing.footer.newsletterSubtitle")}</p>
                        <form onSubmit={(e) => e.preventDefault()}>
                          <div className="form-group position-relative">
                            <input type="email" placeholder={t("landing.footer.emailPlaceholder")} name="email" />
                            <button type="submit" className="btn btn-primary" aria-label={t("landing.footer.subscribe")}>
                              <PaperPlaneIcon />
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="copyright text-center padd30">
        <div className="container">
          <div className="row g-4">
            <div className="col-lg-6 col-md-6 col-sm-12 col-12">
              <p className="m-0 text-xl-start text-lg-start text-md-start text-sm-center text-centers">
                {t("landing.footer.copyright", { year: new Date().getFullYear() })}
              </p>
            </div>
            <div className="col-lg-6 col-md-6 col-sm-12 col-12">
              <ul className="f-legal-links text-xl-end text-lg-end text-md-end text-sm-center text-center">
                <li><a href="#/">{t("landing.footerLinks.privacyPolicy")}</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
