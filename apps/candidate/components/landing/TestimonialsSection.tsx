const TEAM = [
  { name: "Kerstin Spurk", role: "Chief Executive Officer", img: "kerstin-spurk.png", linkedin: "https://www.linkedin.com/in/kerstinspurk" },
  { name: "Anuj Pratap Yadav", role: "Chief Technology Officer", img: "anuj.jpg", linkedin: "https://www.linkedin.com/in/anuj-yadav-63078117" },
  { name: "Bharat Vivek", role: "Chief Marketing Officer & Product", img: "bharat.jpg", linkedin: "https://www.linkedin.com/in/bharat-vivek" },
];

const TESTIMONIALS = [
  { img: "client-img.png", text: "Graduating felt exciting, but terrifying. I had no clue what job would suit me. NuMee helped me align my interests and strengths with real-world roles. The AI roadmap showed exactly what I needed to work on. I landed my first job in 6 weeks.", name: "- Emily Carter", role: "Business Graduate, UCLA" },
  { img: "client-img-1.png", text: "For Employees Seeking Career Growth. I felt stuck in the same position for years. NuMee gave me the clarity and confidence to pursue the promotion I had been hesitating on. The platform highlighted my gaps and helped me close them fast. Three months later, I was promoted to team lead.", name: "- Jason Miller", role: "Digital Marketing Specialist" },
  { img: "client-img-1.png", text: "For Career Changers / Unsatisfied Employees. I'd been working in operations for a decade and needed a serious change. NuMee helped me discover a new path in product management. With a mix of AI insights and mentorship, I made the switch smoothly, and I've never been more fulfilled.", name: "- Rachel Thompson", role: "Former Ops Manager, Now Product Manager" },
];

export default function TestimonialsSection() {
  return (
    <>
      <section className="teams padd100">
        <div className="container">
          <div className="heading text-center mb-5">
            <h2 className="m-0">Our <span>Team</span></h2>
          </div>
          <div className="col-xxl-10 col-xl-11 col-lg-12 col-md-12 col-sm-12 col-12 mx-auto">
            <div className="row g-4">
              {TEAM.map((member) => (
                <div className="col-lg-4 col-md-6 col-sm-6 col-12" key={member.name}>
                  <div className="member_det">
                    <div className="mem_img position-relative">
                      <img src={`/assets/img/${member.img}`} alt="Team" title={member.name} className="img-fluid" />
                      <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="linkedin">
                        <svg className="svg-inline--fa fa-linkedin-in" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.8a53.79 53.79 0 0 1 107.58 0c0 29.7-24.1 54.3-53.79 54.3zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.88-48.3 94 0 111.28 61.9 111.28 142.3V448z" /></svg>
                      </a>
                    </div>
                    <div className="mem_name">
                      <h4>{member.name}</h4>
                      <label>{member.role}</label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="client-reviews bg-white padd100 position-relative" id="testimonials">
        <div className="container">
          <div className="heading text-center">
            <h2 className="text-black m-0">Hear from the <br /><span>NuMee Community</span></h2>
          </div>
          <div id="carouselExampleControls" className="carousel slide mt-5" data-bs-ride="carousel">
            <div className="carousel-inner">
              {TESTIMONIALS.map((item, i) => (
                <div className={`carousel-item${i === 0 ? " active" : ""}`} key={item.name}>
                  <div className="row d-flex align-items-center">
                    <div className="col-lg-4 col-md-6 col-sm-7 col-8 mx-auto">
                      <div className="client-img mb-lg-0 b-md-5 mb-sm-4 mb-4">
                        <img src="/assets/img/client-image-bg.svg" alt="Client Image" className="img-fluid" />
                        <div className="real-img">
                          <img src={`/assets/img/${item.img}`} alt="Client Image" className="img-fluid" />
                        </div>
                      </div>
                    </div>
                    <div className="col-lg-8 col-md-12 col-sm-12 col-12">
                      <div className="review-text position-relative ps-lg-5 ps-md-0 ps-sm-0 ps-0">
                        <p className="m-0">{item.text}</p>
                        <div className="client-details mt-4">
                          <h4>{item.name}</h4>
                          <label className="d-block mt-2">{item.role}</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="carousel-control-prev" type="button" data-bs-target="#carouselExampleControls" data-bs-slide="prev">
              <img src="/assets/img/arrow-right.png" className="img-fluid" alt="Arrow Left" />
            </button>
            <button className="carousel-control-next" type="button" data-bs-target="#carouselExampleControls" data-bs-slide="next">
              <img src="/assets/img/arrow-right.png" className="img-fluid" alt="Arrow Right" />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
