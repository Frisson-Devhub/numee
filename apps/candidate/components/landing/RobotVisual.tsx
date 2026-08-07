"use client";

const FEATURES = [
  { id: "one", title: "AI Job Matching", text: "Quickly identify roles that align with your background. Upload your resume to discover real-time matches tailored to your skills and goals." },
  { id: "two", title: "Your Personal Competence and Qualification", text: "Get a clear picture of where you stand in today's job market based on your education, experience, and strengths." },
  { id: "three", title: "Skill and Competency Gap Detection", text: "Spot what's missing. NuMee pinpoints the exact skills or certifications you need to reach your target roles." },
  { id: "four", title: "Overview of Matching Job Profiles", text: "View a curated list of jobs that fit your interests and competencies — complete with insights on how closely you align with each." },
  { id: "five", title: "Empowered Resume Building", text: "Craft powerful, personalized resumes optimized for your target roles and ready to send out to potential employers." },
  { id: "six", title: "Job Profile Match – Based on Your Personal Interest", text: "NuMee blends your professional background with your career aspirations to find roles that truly fit you." },
  { id: "seven", title: "Mentorship Alongside as YPM", text: "Stay motivated with guidance from industry mentors who support your progress and help you navigate your journey." },
  { id: "eight", title: "Human-Centered Guidance with Real Coaches — Beyond AI", text: "Combine AI precision with human empathy. Get strategic input from real career coaches who understand your unique path." },
];

function FeaturePanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="image-changer position-relative">
      <img src="/assets/img/features.png" className="img-fluid" alt="Our Features" />
      <div className="tab-text">
        <div className="title d-flex flex-wrap align-items-center justify-content-start gap-3 mb-3">
          <h4 className="m-0">{title}</h4>
        </div>
        <p className="m-0">{text}</p>
      </div>
    </div>
  );
}

export default function RobotVisual() {
  return (
    <section className="features bg-blue padd100 position-relative" id="features">
      <div className="heading mb-5 text-center d-xl-none d-lg-block d-md-block d-sm-block d-block">
        <label className="text-uppercase text-center text-white mx-auto mb-2">Our Features</label>
        <h2 className="m-0 text-white">Plan, Learn, Grow — <br />But Smarter.</h2>
        <p className="sub-title text-white mb-0 mt-xl-0 mt-lg-3 mt-sm-3 mt-3 fs-5" style={{ maxWidth: "95%", margin: "0 auto" }}>
          NuMee gives you a complete AI-powered toolkit to accelerate your personal career journey.
        </p>
      </div>
      <div className="container d-xl-block d-lg-none d-md-none d-sm-none d-none">
        <div className="row g-4">
          <div className="col-xl-6 col-lg-5 col-md-6 col-sm-12 col-12">
            <div className="text-area">
              <div className="heading mb-3 d-xl-block d-lg-none d-md-none d-sm-none d-none">
                <label className="text-uppercase text-white mb-2">Our Features</label>
                <h2 className="m-0 text-white">Plan, Learn, Grow — <br />But Smarter.</h2>
              </div>
              <p className="sub-title text-white m-0 d-xl-block d-lg-none d-md-none d-sm-none d-none">
                NuMee gives you a complete AI-powered toolkit to accelerate your personal career journey.
              </p>
              <br className="d-xl-block d-lg-none d-md-none d-sm-none d-none" />
              <div className="feature-tabs mt-2">
                <ul className="nav nav-tabs border-0" id="myTab" role="tablist">
                  {FEATURES.map((f, i) => (
                    <li className="nav-item" role="presentation" key={f.id}>
                      <button className={`nav-link${i === 0 ? " active" : ""}`} id={`${f.id}-tab`} data-bs-toggle="tab" data-bs-target={`#${f.id}`} type="button" role="tab" aria-controls={f.id} aria-selected={i === 0}>
                        {f.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="col-xl-6 col-lg-7 col-md-6 col-sm-12 col-12">
            <div className="tab-content" id="myTabContent">
              {FEATURES.map((f, i) => (
                <div className={`tab-pane fade${i === 0 ? " show active" : ""}`} id={f.id} role="tabpanel" aria-labelledby={`${f.id}-tab`} key={f.id}>
                  <FeaturePanel title={f.title} text={f.text} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="featureAccordian d-xl-none d-lg-block d-md-block d-sm-block d-block">
        <div className="container">
          <div className="accordion" id="accordionExample">
            {FEATURES.map((f, i) => (
              <div className="accordion-item" key={f.id}>
                <h2 className="accordion-header" id={`heading${f.id}`}>
                  <button className={`accordion-button${i === 0 ? "" : " collapsed"}`} type="button" data-bs-toggle="collapse" data-bs-target={`#collapse${f.id}`} aria-expanded={i === 0} aria-controls={`collapse${f.id}`}>
                    <span>{f.title}</span>
                  </button>
                </h2>
                <div id={`collapse${f.id}`} className={`accordion-collapse collapse${i === 0 ? " show" : ""}`} aria-labelledby={`heading${f.id}`} data-bs-parent="#accordionExample">
                  <div className="accordion-body">
                    <div className="accText">{f.text}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
