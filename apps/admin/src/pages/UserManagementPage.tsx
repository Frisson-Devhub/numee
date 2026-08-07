import { useCallback, useEffect, useState } from "react";
import { Search, Upload } from "lucide-react";
import {
  ADMIN_USERS_PER_PAGE,
  ApiCall,
  apiRoutes,
  type ApiUser,
} from "@numee/shared";
import { OnBoardModal } from "@/components/OnBoardModal";
import { DeleteUserModal } from "@/components/DeleteUserModal";
import { ActionSuccessModal } from "@/components/ActionSuccessModal";

type UsersResponse = {
  users: ApiUser[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

/**
 * Paginated user list with search, single delete, and spreadsheet bulk onboard
 * via `OnBoardModal` → `admin.bulkOnboard`.
 */
export function UserManagementPage() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<ApiUser | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(page),
      perPage: String(ADMIN_USERS_PER_PAGE),
    });
    if (search.trim()) params.set("search", search.trim());

    const res = await ApiCall<UsersResponse>({
      url: `${apiRoutes.admin.users}?${params.toString()}`,
      method: "GET",
    });

    if (!res.ok || !res.data) {
      setError(res.error ?? "Failed to load users");
      setUsers([]);
      setLoading(false);
      return;
    }

    setUsers(res.data.users ?? []);
    setTotal(res.data.total ?? 0);
    setTotalPages(Math.max(1, res.data.totalPages ?? 1));
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  async function handleBulkUpload(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await ApiCall<{
      created?: number;
      skipped?: number;
      details?: { created?: string[]; skipped?: string[] };
      error?: string;
    }>({
      url: apiRoutes.admin.bulkOnboard,
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      throw new Error(res.data?.error ?? res.error ?? "Bulk upload failed");
    }
    const created = res.data?.created ?? res.data?.details?.created?.length ?? 0;
    const skipped = res.data?.skipped ?? res.data?.details?.skipped?.length ?? 0;
    setOnboardOpen(false);
    setSuccessMessage(
      `Onboarded ${created} user${created === 1 ? "" : "s"}${skipped ? ` (${skipped} skipped)` : ""}.`
    );
    await loadUsers();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage candidates and onboard users in bulk.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOnboardOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Upload className="h-4 w-4" />
          Onboard Users
        </button>
      </div>

      <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or email"
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Search
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email / Phone</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Last login</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                  Loading users…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-red-600">
                  {error}
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.emailOrPhone}</td>
                  <td className="px-4 py-3 text-gray-600">{user.role ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(user.lastLogin)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(user.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {total} user{total === 1 ? "" : "s"} · Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      <OnBoardModal
        open={onboardOpen}
        onClose={() => setOnboardOpen(false)}
        onBulkUpload={handleBulkUpload}
      />
      <DeleteUserModal
        open={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        userName={
          deleteUser ? `${deleteUser.firstName} ${deleteUser.lastName}` : ""
        }
        onConfirm={() => setDeleteUser(null)}
      />
      <ActionSuccessModal
        open={!!successMessage}
        onClose={() => setSuccessMessage(null)}
        variant="created"
        message={successMessage ?? undefined}
      />
    </div>
  );
}
