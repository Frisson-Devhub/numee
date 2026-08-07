import { Check } from "lucide-react";
import { Modal } from "@numee/shared";

export type ActionSuccessVariant =
  | "created"
  | "updated"
  | "deleted"
  | "university-added"
  | "university-edited";

const config: Record<
  ActionSuccessVariant,
  { title: string; message: string; iconBg: string; iconBorder: string; dotsColor: string }
> = {
  created: {
    title: "Created!",
    message: "User has been created successfully!",
    iconBg: "bg-emerald-500",
    iconBorder: "border-emerald-300",
    dotsColor: "bg-emerald-400",
  },
  updated: {
    title: "Updated!",
    message: "User detail has been updated successfully!",
    iconBg: "bg-emerald-500",
    iconBorder: "border-emerald-300",
    dotsColor: "bg-emerald-400",
  },
  deleted: {
    title: "Deleted!",
    message: "User has been deleted successfully!",
    iconBg: "bg-red-500",
    iconBorder: "border-red-300",
    dotsColor: "bg-red-400",
  },
  "university-added": {
    title: "Added!",
    message: "University has been added successfully!",
    iconBg: "bg-emerald-500",
    iconBorder: "border-emerald-300",
    dotsColor: "bg-emerald-400",
  },
  "university-edited": {
    title: "Edited!",
    message: "University has been edited successfully!",
    iconBg: "bg-emerald-500",
    iconBorder: "border-emerald-300",
    dotsColor: "bg-emerald-400",
  },
};

type ActionSuccessModalProps = {
  open: boolean;
  onClose: () => void;
  variant: ActionSuccessVariant;
  message?: string;
};

export function ActionSuccessModal({
  open,
  onClose,
  variant,
  message: messageOverride,
}: ActionSuccessModalProps) {
  const { title, message, iconBg, iconBorder, dotsColor } = config[variant];
  const displayMessage = messageOverride ?? message;

  return (
    <Modal open={open} onClose={onClose} className="max-w-md">
      <div className="p-6 text-center">
        <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center">
          <div className={`absolute inset-0 rounded-full border-2 border-dashed ${iconBorder} ${iconBg} opacity-20`} />
          <div className={`relative flex h-14 w-14 items-center justify-center rounded-full ${iconBg} text-white`}>
            <Check className="h-7 w-7" strokeWidth={2.5} />
          </div>
          <span className={`absolute -right-1 top-1 h-2 w-2 rounded-full ${dotsColor}`} />
          <span className={`absolute -left-2 top-3 h-1.5 w-1.5 rounded-full ${dotsColor}`} />
          <span className={`absolute -bottom-1 left-1 h-1.5 w-1.5 rounded-full ${dotsColor}`} />
          <span className={`absolute -right-3 top-5 h-1 w-1 rounded-full ${dotsColor}`} />
          <span className={`absolute right-0 -bottom-2 h-1 w-1 rounded-full ${dotsColor}`} />
          <span className={`absolute left-0 top-6 h-1 w-1 rounded-full ${dotsColor}`} />
        </div>

        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <p className="mt-2 text-sm text-gray-600">{displayMessage}</p>

        <div className="mt-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
