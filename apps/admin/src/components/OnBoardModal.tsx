import { useRef, useState } from "react";
import { Download, Upload, Loader2 } from "lucide-react";
import { Modal, type OnBoardModalProps } from "@numee/shared";

const TEMPLATE_HREF = "/templates/bulk_upload_template.xlsx";

/** Bulk onboard UI: download template or pick CSV/XLSX; upload errors stay in-modal. */
export function OnBoardModal({ open, onClose, onBulkUpload }: OnBoardModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleBulkUploadClick() {
    setError(null);
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await onBulkUpload?.(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-md">
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-900">Onboard Users</h2>
        <p className="mt-2 text-sm text-gray-500">
          Download a sample template or upload a file to bulk onboard users.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleFileChange}
          aria-hidden
        />

        <div className="mt-6 flex flex-col gap-3">
          <a
            href={TEMPLATE_HREF}
            download
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors no-underline"
          >
            <Download className="h-4 w-4" />
            Download Sample
          </a>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            disabled={uploading}
            onClick={handleBulkUploadClick}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[linear-gradient(to_right,#2D6CD5,#F17E26)] px-4 py-3 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(0,0,0,0.1)] hover:opacity-95 transition-opacity disabled:opacity-70 disabled:pointer-events-none"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading…" : "Onboard Users with Bulk Upload"}
          </button>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
