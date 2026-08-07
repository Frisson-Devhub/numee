import { Modal } from "@numee/shared";

type DeleteUserModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName?: string;
};

export function DeleteUserModal({ open, onClose, onConfirm, userName }: DeleteUserModalProps) {
  function handleConfirm() {
    onConfirm();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-md">
      <div className="p-6 text-center">
        <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-red-300 bg-red-50" />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-2xl font-bold text-white">
            ?
          </div>
          <span className="absolute -right-1 top-0 h-2 w-2 rounded-full bg-red-400" />
          <span className="absolute -left-1 top-2 h-1.5 w-1.5 rounded-full bg-red-400" />
          <span className="absolute -bottom-1 left-2 h-1.5 w-1.5 rounded-full bg-red-400" />
          <span className="absolute -right-2 top-4 h-1 w-1 rounded-full bg-red-400" />
          <span className="absolute right-0 -bottom-2 h-1 w-1 rounded-full bg-red-400" />
        </div>

        <h2 className="text-xl font-bold text-gray-900">Are you sure?</h2>
        <p className="mt-2 text-sm text-gray-500">
          Do you really want to delete {userName ? `"${userName}"` : "this user"}? This process cannot be
          undone.
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </Modal>
  );
}
