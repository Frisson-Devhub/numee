"use client";

const SURVEY_URL = "https://forms.office.com/Pages/ResponsePage.aspx?id=BZHu2AqWVE2tRLJb87b-COreJ2KFeKVEjHmeEfR0obBUQzM4TDFYUlY3UzRYQTNFSUFIMkdYUlRGQyQlQCN0PWcu";

export default function ShapeModelSection() {
  return (
    <section className="survey padd100 position-relative" id="survey">
      <div className="container">
        <div className="heading text-center mb-5">
          <label className="text-uppercase mx-auto">Numee Survey</label>
          <h2 className="m-0">Help Us To <span>Shape</span> The Model</h2>
          <p className="m-0">We&apos;d love to hear from you! Your feedback helps us personalize NuMee even better.</p>
        </div>
        <div className="row d-flex align-items-center g-4">
          <div className="col-xl-6 col-lg-5 col-md-6 col-sm-12 col-12">
            <div className="img-column">
              <img src="/assets/img/survey-img.svg" alt="Survey" className="img-fluid" />
            </div>
          </div>
          <div className="col-xl-6 col-lg-7 col-md-6 col-sm-12 col-12">
            <div className="text-area ps-lg-5 ps-md-0 ps-sm-0 ps-0 ms-lg-5 ms-md-3 ms-sm-0 ms-0 text-md-start text-sm-center text-center">
              <h4 className="mb-lg-3 mb-md-2 mb-sm-2 mb-2">As a <span>BIG THANK YOU</span></h4>
              <p className="pb-3 text-md-start text-sm-center text-center">
                You will receive a free account on NuMee for 1 year** if your country has the most survey participants* till the end of July 25
              </p>
              <button type="button" onClick={() => window.open(SURVEY_URL, "_blank")} className="btn btn-primary mt-lg-4 mt-md-3 mt-sm-3 mt-3 d-flex align-items-center gap-3">
                Do it now
                <svg className="svg-inline--fa fa-circle-arrow-right" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M0 256a256 256 0 1 0 512 0A256 256 0 1 0 0 256zM297 385c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l71-71L120 280c-13.3 0-24-10.7-24-24s10.7-24 24-24l214.1 0-71-71c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0L409 239c9.4 9.4 9.4 24.6 0 33.9L297 385z" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
