"use client";

export default function ContactModal() {
  return (
    <div className="modal fade" id="joinwaitlist" tabIndex={-1} aria-labelledby="joinwaitlistlabel" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content joinwaitlist">
          <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
          <h4 className="mb-4">Get In Touch</h4>
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="form-group mb-3">
              <label htmlFor="name" className="w-100 d-block">Name</label>
              <input type="text" id="name" name="name" className="form-control" placeholder="Enter Your Name" required />
            </div>
            <div className="form-group mb-4">
              <label htmlFor="email" className="w-100 d-block">Email ID</label>
              <input type="email" id="email" className="form-control" name="email" placeholder="Email Address" required />
            </div>
            <div className="form-group mb-4">
              <label htmlFor="msg">Your Message</label>
              <textarea id="msg" name="msg" className="form-control" placeholder="Enter Your Message" />
            </div>
            <button type="submit" className="btn btn-primary mt-2 w-100">Submit</button>
          </form>
        </div>
      </div>
    </div>
  );
}
