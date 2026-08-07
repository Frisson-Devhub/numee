const WHY_US_TABS = [
  {
    id: "home",
    label: "Human-Centered Guidance",
    image: "/assets/img/thumb-impression.svg",
    alt: "Thumb Impression",
    content: (
      <>
        <p className="text-white"><strong>NuMee is the first curated and private (domain specific) AI based solution</strong> to address individual needs and personal questions around business life.</p>
        <p className="text-white">Our customers seek mentorship and guidance for a future career path with purpose. NuMee responses are based on feedback and information of human beings, which makes it more relatable and trustworthy.</p>
        <h4 className="text-white mb-3">NuMee &gt;&gt; your personal mentor YPM</h4>
        <p className="text-white"><strong>WARNING:</strong> Never upload your personal information to an open source AI - your personal information are private. They belong to you as your finger print. If you give access to your finger print to anyone around the world, you can imagine what can be done by this. Please be safe !</p>
        <p className="text-white"><span>NuMee</span> is &gt;&gt; <span>unique</span> - <span>safe</span> - <span>private</span> - <span>individualized</span> &lt;&lt; this is our promise to you and a USP in the market.</p>
      </>
    ),
  },
  {
    id: "profile",
    label: "Privacy You Can Trust",
    image: "/assets/img/made-in-germany.png",
    alt: "Made in Germany",
    content: (
      <>
        <p className="text-white"><strong>NuMee is strictly following General Data Protection Regulation (GDPR)</strong> , and will never compromise data and privacy. Our customers will always feel safe and valued in their journey with NuMee. Our customers always will own their data.</p>
        <h4 className="text-white mb-3">NuMee &gt;&gt; your personal mentor YPM</h4>
        <p className="text-white"><strong>WARNING:</strong> Never allow anyone to use your private data. Always make a proper decision which data are allowed to be used by any company. Germany holds the highest GDPR standards. Be aware with whom you share you data and what they want to do with it. Please be safe !</p>
        <p className="text-white"><span>NuMee</span> is &gt;&gt; <span>transparent</span> - <span>private</span> - <span>compliant</span> - <span>accurate</span> - <span>values inclusion and diversity</span> &lt;&lt; this is our promise to you and a USP in the market</p>
      </>
    ),
  },
  {
    id: "trust",
    label: "Trustworthiness You Can Rely On",
    image: "/assets/img/trust.png",
    alt: "Trustworthiness",
    content: (
      <>
        <p className="text-white">NuMee is transparent, reliable, fair, and accountable, so users can confidently rely on Numee&apos;s outcomes and decisions.</p>
        <h4 className="text-white mb-3">NuMee &gt;&gt; your personal mentor YPM</h4>
        <p className="text-white"><strong>WARNING:</strong> Not all AI systems are created equally. Some make decisions behind closed doors, leaving you uninformed. Always demand transparency, inquire about how results are generated, and choose carefully to protect your best interests. Please stay safe!</p>
        <p className="text-white"><span>NuMee</span> is &gt;&gt; <span>trustworthy</span> - <span>fair</span> - <span>reliable</span> - <span>accountable</span> - <span>transparent</span> &lt;&lt; this is our promise to you and a USP in the market.</p>
      </>
    ),
  },
];

export default function GuidingPrinciples() {
  return (
    <section className="why-us padd100 position-relative bg-blue" id="whyus">
      <div className="container position-relative">
        <div className="heading text-center d-flex flex-column justify-content-center position-relative">
          <div className="logo-presentation">
            <img src="/assets/img/logo.svg" className="img-fluid" alt="NuMee Logo" title="NuMee - Your Personal Mentor" height={50} />
          </div>
          <label className="text-uppercase mx-auto text-white">Why Choose Us?</label>
          <h2 className="text-white">Our Guiding Principles - Our <br />promise to you</h2>
        </div>
        <div className="why-us-tabs mt-md-5 mt-sm-4 mt-4">
          <ul className="nav nav-tabs d-flex align-items-center justify-content-center border-0" id="myTab1" role="tablist">
            {WHY_US_TABS.map((tab, i) => (
              <li className="nav-item" role="presentation" key={tab.id}>
                <button className={`nav-link${i === 0 ? " active" : ""}`} id={`${tab.id}-tab`} data-bs-toggle="tab" data-bs-target={`#${tab.id}`} type="button" role="tab" aria-controls={tab.id} aria-selected={i === 0}>
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="tab-content mt-5" id="myTabContent1">
            {WHY_US_TABS.map((tab, i) => (
              <div className={`tab-pane fade${i === 0 ? " show active" : ""}`} id={tab.id} role="tabpanel" aria-labelledby={`${tab.id}-tab`} key={tab.id}>
                <div className="row g-4">
                  <div className="col-lg-5 col-md-12 col-sm-12 col-12">
                    <div className="human-img">
                      <img src={tab.image} className="img-fluid" alt={tab.alt} />
                    </div>
                  </div>
                  <div className="col-lg-7 col-md-12 col-sm-12 col-12">
                    <div className="text-area ps-xl-5 ps-lg-3 ps-md-2 ps-sm-0 ps-0">{tab.content}</div>
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
