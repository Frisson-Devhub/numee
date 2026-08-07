import { SUCCESS_MIRROR_HELP_POINTS } from "@/constants/successMirror";

function HelpPointsList({ className = "" }: { className?: string }) {
  return (
    <ul className={`help-points d-flex flex-wrap align-items-start justify-content-start pt-3 ${className}`}>
      {SUCCESS_MIRROR_HELP_POINTS.map((point) => (
        <li key={point}>
          <div className="icon d-flex align-items-center justify-content-center">
            <img src="/assets/img/blue-check.svg" className="img-fluid" alt="Blue Check" />
          </div>
          {point}
        </li>
      ))}
    </ul>
  );
}

export default function SuccessMirror() {
  return (
    <section className="mentorship bg-white position-relative padd100">
      <div className="container position-relative">
        <div className="row g-4">
          <div className="col-lg-6 col-md-12 col-sm-12 col-12">
            <div className="img-column pe-lg-0 pe-md-0 pe-sm-0 pe-0">
              <img src="/assets/img/mentorship.png" className="img-fluid" alt="Mentorship" title="NuMee — Your Personal Mentor." />
            </div>
          </div>
          <div className="col-lg-6 col-md-12 col-sm-12 col-12">
            <div className="text-area ps-lg-4 ps-md-0 ps-sm-0 ps-0">
              <div className="heading mb-3">
                <label className="text-uppercase m-0">Mentorship</label>
                <h2 className="mb-0">NuMee — <span>Your Personal Mentor.</span></h2>
              </div>
              <p>
                With <strong style={{ fontWeight: 600 }}>NuMee</strong>, you don&apos;t just get generic advice.
                You get clarity, structure, and personalized direction based on who you are, what you want, , and what you want.
              </p>
              <p>NuMee is matching your wishes towards the existing and progressing job market to find your personal Best Fit.</p>
              <p>Numee helps you discover:</p>
              <HelpPointsList className="d-xxl-flex d-xl-flex d-lg-none" />
            </div>
          </div>
        </div>
        <div className="w-full d-xxl-none d-xl-none d-lg-block d-md-none d-sm-none d-none">
          <HelpPointsList className="w-full" />
        </div>
      </div>
    </section>
  );
}
