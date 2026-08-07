import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Modal } from "@numee/shared";

const departments = ["Engineering", "Computer Science", "Design", "Business", "Operations", "Program Management"];
const universities = ["Harvard University", "MIT", "Stanford University", "Oxford University", "ABC University"];
const roles = ["Admin", "Mentor", "Student", "Program Manager"];
const statuses = ["Active", "Inactive", "Pending"];

/** User row passed into create/edit modal (local admin draft model). */
export type UserForModal = {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  status: string;
  university?: string;
};

type CreateUserModalProps = {
  open: boolean;
  onClose: () => void;
  user?: UserForModal | null;
  onSubmit?: (data: Record<string, string>, editingId?: number) => void;
};

/** Keep the last 10 digits for the mobile field when editing an existing user. */
function phoneToMobile(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

/** Create/edit user form (local draft until university APIs are wired). */
export function CreateUserModal({ open, onClose, user, onSubmit }: CreateUserModalProps) {
  const isEdit = !!user;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [department, setDepartment] = useState("");
  const [university, setUniversity] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (open && user) {
      setName(user.name);
      setEmail(user.email);
      setMobile(phoneToMobile(user.phone));
      setDepartment(user.department);
      setUniversity(user.university ?? "");
      setRole(user.role);
      setStatus(user.status);
      setPassword("");
    } else if (open && !user) {
      setName("");
      setEmail("");
      setMobile("");
      setDepartment("");
      setUniversity("");
      setRole("");
      setStatus("");
      setPassword("");
    }
  }, [open, user]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit?.(
      { name, email, mobile, department, university, role, status, password },
      user?.id
    );
    handleClose();
  }

  function handleClose() {
    setName("");
    setEmail("");
    setMobile("");
    setDepartment("");
    setUniversity("");
    setRole("");
    setStatus("");
    setPassword("");
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} className="max-w-2xl">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">{isEdit ? "Edit User" : "Create User"}</h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-4">
              <div>
                <label htmlFor="create-user-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  id="create-user-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter name"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="create-user-mobile" className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number
                </label>
                <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
                  <span className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm text-gray-600 bg-gray-50 border-r border-gray-200">
                    <span className="text-base" aria-hidden>
                      🇮🇳
                    </span>
                    <span>+91</span>
                  </span>
                  <input
                    id="create-user-mobile"
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="Enter mobile number"
                    className="flex-1 min-w-0 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="create-user-department" className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select
                  id="create-user-department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="create-user-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="create-user-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isEdit ? "••••••••" : "Enter password"}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="create-user-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email ID
                </label>
                <input
                  id="create-user-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="create-user-university" className="block text-sm font-medium text-gray-700 mb-1">
                  Select University
                </label>
                <select
                  id="create-user-university"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select university</option>
                  {universities.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="create-user-role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  id="create-user-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select role</option>
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="create-user-status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="create-user-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select status</option>
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-gradient-to-r from-orange-400 to-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:from-orange-500 hover:to-blue-700 transition-all shadow-sm"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
