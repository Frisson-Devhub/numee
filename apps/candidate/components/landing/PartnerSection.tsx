export default function PartnerSection() {
  return (
    <section className="clarity-call-section bg-white padd100">
      <div className="container">
        <div className="row d-flex align-items-center g-4">
          <div className="col-lg-5 col-md-4 col-sm-12 col-12">
            <div className="clairty_img text-center mt-lg-0 mt-md-5 mt-sm-4 mt-4">
              <img src="/assets/img/kerstin_spurk.png" className="img-fluid" alt="Kerstin Spurk" title="Kerstin Spurk" />
            </div>
          </div>
          <div className="col-lg-7 col-md-8 col-sm-12 col-12">
            <div className="clarity_text text-start pe-md-5 pe-sm-0 pe-0 mb-lg-5">
              <div className="heading text-start mb-md-3 mb-sm-3 mb-3">
                <label className="text-uppercase text-start">Talk with Us</label>
                <h2 className="mb-0">Not Sure What&apos;s Next? <span>Let&apos;s Talk.</span></h2>
              </div>
              <div className="sub-title mb-md-3 mb-sm-3 mb-3">
                Book a free <span>20-minute</span> call to get career clarity and see how NuMee can support your journey.
              </div>
              <div className="talkPoint">
                <p>Feeling stuck or unsure about your next step?</p>
                <p>We&apos;re offering quick 1-on-1 calls to understand your goals and share how NuMee&apos;s AI mentor can help.</p>
                <p>No pressure. Just real talk, tailored to you.</p>
              </div>
              <button className="btn btn-primary d-flex align-items-center gap-3 mt-md-5 mt-sm-5 mt-4" data-bs-toggle="modal" data-bs-target="#joinwaitlist" type="button">
                Book Your Free Call
                <svg className="svg-inline--fa fa-circle-arrow-right" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M0 256a256 256 0 1 0 512 0A256 256 0 1 0 0 256zM297 385c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l71-71L120 280c-13.3 0-24-10.7-24-24s10.7-24 24-24l214.1 0-71-71c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0L409 239c9.4 9.4 9.4 24.6 0 33.9L297 385z" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
