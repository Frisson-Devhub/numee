"use client";

import { Modal } from "./Modal";

function SuccessCheckIcon() {
  return (
    <svg
      className="w-16 h-16 mx-auto text-green-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

export function AccountCreatedModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
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
        <SuccessCheckIcon />
        <h3 className="mt-6 text-xl font-bold text-gray-900">Success!</h3>
        <p className="mt-3 text-sm text-gray-600 leading-relaxed">
          Your account has been created successfully.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full py-2.5 rounded-lg font-medium text-gray-800 bg-white border border-gray-300 hover:bg-gray-50 transition"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
