"use client";

import { Modal } from "./Modal";

function EnvelopeCheckIcon() {
  return (
    <svg
      className="w-16 h-16 mx-auto"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="checkEmailGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <path
        d="M10 22L40 42L70 22V58H10V22Z"
        stroke="url(#checkEmailGrad)"
        strokeWidth="3"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M10 22L40 42L70 22"
        stroke="url(#checkEmailGrad)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M28 42L36 50L52 34"
        stroke="url(#checkEmailGrad)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CheckEmailModal({
  open,
  onClose,
  email = "de***@example.com",
}: {
  open: boolean;
  onClose: () => void;
  email?: string;
}) {
  return (
    <Modal open={open} onClose={onClose}>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 p-1 text-gray-400 hover:text-gray-600 rounded transition"
        aria-label="Close"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="p-8 pt-12 text-center">
        <EnvelopeCheckIcon />
        <h3 className="mt-6 text-xl font-bold text-gray-900">Check Your Email</h3>
        <p className="mt-3 text-sm text-gray-600 leading-relaxed">
          A 4-digit OTP has been sent to your registered email address {email}. Please check your
          inbox and proceed.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full py-2.5 rounded-lg font-medium text-gray-800 bg-white border border-gray-300 hover:bg-gray-50 transition"
        >
          OK
        </button>
      </div>
    </Modal>
  );
}
