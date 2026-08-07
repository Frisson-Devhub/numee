"use client";

import { useI18n } from "@/contexts/I18nContext";

export default function EmpowerSection() {
  const { t } = useI18n();

  return (
    <section className="about-us position-relative bg-blue padd100" id="aboutus">
      <div className="container position-relative">
        <div className="heading text-center">
          <label className="text-uppercase mx-auto text-white">{t("landing.nav.about")}</label>
          <h2 className="mb-0 text-white">{t("landing.empower.title")}</h2>
        </div>
        <div className="row d-flex align-items-center g-4 mt-4">
          <div className="col-lg-6 col-md-12 col-sm-12 col-12">
            <div className="text-area pe-xl-4 pe-lg-0 pe-md-0 pe-sm-0 pe-0">
              <div className="sub-title text-white mb-3">At NuMee, we believe career growth should be personal, accessible, and dynamic.</div>
              <p className="text-white">{t("landing.empower.paragraph1")}</p>
              <p className="text-white">{t("landing.empower.paragraph2")}</p>
              <p className="text-white">We built NuMee to be the smart, supportive, and strategic partner we all wish we had.</p>
            </div>
          </div>
          <div className="col-lg-6 col-md-12 col-sm-12 col-12">
            <div className="img-column abt-img position-relative">
              <img src="/assets/img/about-img-1.png" className="img-fluid img1" alt="About Image 1" />
              <img src="/assets/img/about-img-2.png" className="img-fluid img2" alt="About Image 2" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
