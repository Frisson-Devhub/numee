const AMBITION_ITEMS = [
  { img: "students-graduates.jpg", icon: "ambition-icon-1.svg", title: "Students & Graduates", text: "Confused about your first step after graduation? NuMee analyzes your education, skills, and interests to help you choose a suitable career path, then shows you how to get there with confidence." },
  { img: "growth-seeking-employees.jpg", icon: "ambition-icon-3.svg", title: "Growth-Seeking Employees", text: "Looking for a promotion or next-level role? NuMee maps the exact skills and steps needed to move forward and gives you weekly actions to keep progressing, without the guesswork." },
  { img: "career-changer.jpg", icon: "ambition-icon-2.svg", title: "Career Changers", text: "Feeling unsatisfied or stuck in the wrong job? Whether you want to switch industries or redefine your role, NuMee helps you explore options, validate your next move, and build your new professional identity." },
  { img: "companies-employers.jpg", icon: "ambition-icon-4.svg", title: "Companies & Employers", text: "Want to retain and upskill your people? NuMee empowers employees to grow within your organization, closing skill gaps and increasing engagement with a modern, scalable solution." },
];

export default function RoadmapFeatures() {
  return (
    <section className="ambition padd100 bg-white position-relative">
      <div className="container">
        <div className="heading text-start">
          <label className="text-uppercase">Who It&apos;s For</label>
          <h2>A Personalized Path for Every <span>Ambition</span></h2>
        </div>
        <div className="ambition-points d-flex flex-wrap flex-xxl-column flex-xl-column flex-lg-row mt-5">
          {AMBITION_ITEMS.map((item) => (
            <div className="ambition-item" key={item.title}>
              <div className="ambition-img mb-xl-0 mb-lg-4 mb-md-4 mb-sm-3 mb-3">
                <img src={`/assets/img/${item.img}`} alt={item.title} className="img-fluid" />
              </div>
              <div className="ambition-icon">
                <div className="icon d-flex align-items-center justify-content-center">
                  <img src={`/assets/img/${item.icon}`} alt="Ambition Icon" className="img-fluid" />
                </div>
                <h4>{item.title}</h4>
              </div>
              <div className="ambition-text mt-xl-0 mt-lg-3 mt-md-2 mt-sm-2 mt-2">
                <p className="mb-0">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
