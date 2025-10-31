import { useCallback, useEffect, useMemo, useState } from "react";

import { authorizedFetch } from "../../utils/dashboardApi";
import {
  dispatchDashboardMessage,
  type DashboardTone,
} from "../../utils/dashboardEvents";

type UserManagementTableProps = {
  apiBase: string;
  role: string;
};

type ManagedUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

const ROLE_OPTIONS = ["admin", "editor", "author", "viewer"] as const;

const notify = (message: string, tone: DashboardTone) => {
  dispatchDashboardMessage({ message, tone });
};

const formatName = (user: ManagedUser) => {
  if (user.name && user.name.trim().length > 0) {
    return user.name;
  }
  return user.email.split("@")[0];
};

const UserManagementTable = ({ apiBase, role }: UserManagementTableProps) => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const normalizedBase = useMemo(
    () => (apiBase && apiBase.length > 0 ? apiBase : ""),
    [apiBase],
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await authorizedFetch(normalizedBase, "/api/users", {
        method: "GET",
      });

      if (response.status === 403) {
        setUsers([]);
        setLoading(false);
        setError(null);
        return;
      }

      const body = await response
        .json()
        .catch(() => ({ error: "Unable to load users." }));

      if (!response.ok) {
        const message =
          typeof body?.error === "string" ? body.error : "Unable to load users.";
        setError(message);
        setUsers([]);
        setLoading(false);
        return;
      }

      const list = Array.isArray(body?.users) ? body.users : [];
      setUsers(
        list.map((user: ManagedUser) => ({
          id: String(user.id),
          name: user.name ?? null,
          email: user.email,
          role: user.role,
        })),
      );
      setLoading(false);
    } catch {
      setError("Unable to load users.");
      setUsers([]);
      setLoading(false);
    }
  }, [normalizedBase]);

  useEffect(() => {
    if (role !== "admin") return;
    void loadUsers();
  }, [role, loadUsers]);

  const handleRoleChange = useCallback(
    async (userId: string, nextRole: string) => {
      const previous = users.find((user) => user.id === userId);
      if (!previous || previous.role === nextRole) return;

      setUpdatingId(userId);
      notify("Updating user role…", "info");

      try {
        const response = await authorizedFetch(
          normalizedBase,
          `/api/users/${userId}`,
          {
            method: "PATCH",
            body: JSON.stringify({ role: nextRole }),
          },
        );

        const body = await response
          .json()
          .catch(() => ({ error: "Unable to update user role." }));

        if (!response.ok) {
          const message =
            typeof body?.error === "string"
              ? body.error
              : "Unable to update user role.";
          notify(message, "error");
          setUpdatingId(null);
          void loadUsers();
          return;
        }

        setUsers((prev) =>
          prev.map((user) =>
            user.id === userId ? { ...user, role: nextRole } : user,
          ),
        );
        notify("Role updated successfully.", "success");
        setUpdatingId(null);
      } catch {
        notify("Unable to update user role.", "error");
        setUpdatingId(null);
        void loadUsers();
      }
    },
    [loadUsers, normalizedBase, users],
  );

  if (role !== "admin") {
    return null;
  }

  return (
    <section className="space-y-4 rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-100">
      <h2 className="text-xl font-semibold text-slate-900">User Management</h2>
      {loading ? (
        <p className="text-sm text-slate-600">Loading users…</p>
      ) : error ? (
        <p className="text-sm font-semibold text-rose-600">{error}</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-slate-600">No users found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-700">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-semibold uppercase tracking-wide text-slate-500">
                  Name
                </th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wide text-slate-500">
                  Email
                </th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wide text-slate-500">
                  Role
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3">{formatName(user)}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      disabled={updatingId === user.id}
                      onChange={(event) =>
                        void handleRoleChange(user.id, event.target.value)
                      }
                      className="rounded border border-slate-200 px-2 py-1 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
                    >
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default UserManagementTable;

