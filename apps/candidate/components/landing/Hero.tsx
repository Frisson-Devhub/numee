"use client";

import { useI18n } from "@/contexts/I18nContext";
import Typewriter from "./Typewriter";

export default function Hero() {
  const { t } = useI18n();

  return (
    <section className="heropanel--video bg-blue">
      <div className="container-fluid">
        <div className="heropanel__content">
          <div className="row">
            <div className="col-xxl-6 col-xl-6 col-lg-12 col-md-12 col-sm-12 col-12 d-flex align-items-center" style={{ height: "100%" }}>
              <div className="text-area pe-xxl-0 pe-xl-0 pe-lg-0 pe-md-0 pe-sm-0 pe-0">
                <div className="heading">
                  <h2 className="text-white">
                    {t("landing.hero.line1")} <span>{t("landing.hero.careerGoals")}</span> <br />
                    {t("landing.hero.line2")}
                  </h2>
                  <p className="sub-title text-white">{t("landing.hero.tagline")}</p>
                </div>
                <div className="col-xxl-11 col-xl-12 col-lg-9 col-md-12 col-12">
                  <p className="text-white pe-xxl-5 pe-xl-0 pe-lg-0 pe-md-0 pe-sm-0 pe-0">{t("landing.hero.description1")}</p>
                  <p className="text-white pe-xxl-5 pe-xl-0 pe-lg-0 pe-md-0 pe-sm-0 pe-0" style={{ minHeight: 86 }}>
                    Your AI-powered personal mentor (YPM) understands
                    <br />
                    <Typewriter /> and builds a personalized career roadmap.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-xl-6 col-lg-12 col-md-12 col-sm-12 col-12">
              <div className="hero_robot">
                <div className="professionimg">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <img key={n} src={`/assets/img/prof${n}.png`} className="img-fluid" alt="Profession" title="Profession Image" />
                  ))}
                </div>
                <div className="robotmen">
                  <img src="/assets/img/ai-robot.png" className="img-fluid ai-men" alt="AI Mentor" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
