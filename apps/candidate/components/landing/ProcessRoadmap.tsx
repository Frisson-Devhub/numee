const PROCESS_STEPS = [
  { title: "Get NuMee", text: "Your Mentor in the Pocket - YPM - and receive guidance at anytime." },
  { title: "Tell NuMee About You", text: "and start a real-time conversation with YPM." },
  { title: "Get Smart and Personalized Tips", text: "Receive advice tailored just for you, whenever you need. For instance to prepare for your interview, or your promotion." },
  { title: "Find Your Best Job Fit", text: "NuMee is matching your skills, experiences and preferences againstagaist real Job Profiles.." },
  { title: "Prepare to Shine", text: "Learn what you need to grow and succeed." },
  { title: "Make Confident Moves", text: "Get ongoing guidance to choose your next step." },
  { title: "Find out your next step", text: "Life is ongoing and so is your career. Stay tuned with NuMee" },
];

export default function ProcessRoadmap() {
  return (
    <section className="process bg-white position-relative">
      <img src="/assets/img/process.svg" alt="Our Process" className="img-fluid w-100 d-md-block d-sm-none d-none" />
      <div className="container">
        <div className="heading">
          <label className="text-uppercase d-md-none d-sm-block d-block">Process</label>
          <h2>NuMee Career Journey — Your Easy Path to <span>Career Success</span></h2>
        </div>
        <div className="processflow d-md-none d-sm-block d-block mt-md-0 mt-sm-4 mt-4">
          {PROCESS_STEPS.map((step) => (
            <div className="item" key={step.title}>
              <h4>{step.title}</h4>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
