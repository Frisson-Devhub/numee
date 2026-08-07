import { useCallback, useEffect, useState } from "react";
import { ApiCall, apiRoutes } from "@numee/shared";

type Industry = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
  embeddingStatus: string;
  _count?: { jobRoles?: number; jobs?: number };
};

type JobRole = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  industryId?: string | null;
  isActive: boolean;
  embeddingStatus: string;
  industry?: { id: string; name: string; slug: string } | null;
  _count?: { jobs?: number };
};

/**
 * Admin catalog CRUD for industries and job roles (includes inactive).
 * Creates enqueue embeddings on Nest; deletes are hard deletes with confirm.
 */
export function CatalogPage() {
  const [tab, setTab] = useState<"industries" | "roles">("industries");
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [industryId, setIndustryId] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [indRes, roleRes] = await Promise.all([
      ApiCall<{ industries?: Industry[]; error?: string }>({
        url: `${apiRoutes.admin.industries}?includeInactive=1`,
        method: "GET",
      }),
      ApiCall<{ jobRoles?: JobRole[]; error?: string }>({
        url: `${apiRoutes.admin.jobRoles}?includeInactive=1`,
        method: "GET",
      }),
    ]);
    if (!indRes.ok) {
      setError(indRes.error ?? "Failed to load industries");
      setLoading(false);
      return;
    }
    if (!roleRes.ok) {
      setError(roleRes.error ?? "Failed to load job roles");
      setLoading(false);
      return;
    }
    setIndustries(indRes.data?.industries ?? []);
    setJobRoles(roleRes.data?.jobRoles ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    if (tab === "industries") {
      const res = await ApiCall<{ error?: string }>({
        url: apiRoutes.admin.industries,
        method: "POST",
        body: { name: name.trim(), description: description.trim() || null },
      });
      if (!res.ok) {
        setError(res.data?.error ?? res.error ?? "Failed to create industry");
        setSaving(false);
        return;
      }
    } else {
      const res = await ApiCall<{ error?: string }>({
        url: apiRoutes.admin.jobRoles,
        method: "POST",
        body: {
          name: name.trim(),
          description: description.trim() || null,
          industryId: industryId || null,
        },
      });
      if (!res.ok) {
        setError(res.data?.error ?? res.error ?? "Failed to create job role");
        setSaving(false);
        return;
      }
    }
    setName("");
    setDescription("");
    setIndustryId("");
    setSaving(false);
    await load();
  }

  async function handleDeleteIndustry(id: string) {
    if (!confirm("Delete this industry?")) return;
    const res = await ApiCall<{ error?: string }>({
      url: apiRoutes.admin.industry(id),
      method: "DELETE",
    });
    if (!res.ok) {
      setError(res.data?.error ?? res.error ?? "Delete failed");
      return;
    }
    await load();
  }

  async function handleDeleteRole(id: string) {
    if (!confirm("Delete this job role?")) return;
    const res = await ApiCall<{ error?: string }>({
      url: apiRoutes.admin.jobRole(id),
      method: "DELETE",
    });
    if (!res.ok) {
      setError(res.data?.error ?? res.error ?? "Delete failed");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Catalog</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage industries and job roles used for matching and job forms.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("industries")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            tab === "industries"
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Industries ({industries.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("roles")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            tab === "roles"
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Job roles ({jobRoles.length})
        </button>
      </div>

      <form
        onSubmit={(e) => void handleCreate(e)}
        className="rounded-lg border border-gray-200 bg-white p-4 space-y-3"
      >
        <h2 className="text-sm font-semibold text-gray-900">
          Add {tab === "industries" ? "industry" : "job role"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {tab === "roles" && (
            <select
              className="rounded-md border border-gray-300 px-3 py-2 text-sm sm:col-span-2"
              value={industryId}
              onChange={(e) => setIndustryId(e.target.value)}
            >
              <option value="">No industry</option>
              {industries.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Create"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : tab === "industries" ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Roles</th>
                <th className="px-4 py-3">Embedding</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {industries.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {row.name}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{row.slug}</td>
                  <td className="px-4 py-3">{row._count?.jobRoles ?? 0}</td>
                  <td className="px-4 py-3 text-xs uppercase">
                    {row.embeddingStatus}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void handleDeleteIndustry(row.id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Industry</th>
                <th className="px-4 py-3">Embedding</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {jobRoles.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {row.name}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {row.industry?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs uppercase">
                    {row.embeddingStatus}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void handleDeleteRole(row.id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
