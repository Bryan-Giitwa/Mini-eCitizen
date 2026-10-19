import { useEffect, useState } from "react";
import { Fragment } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import PasswordInput from "./PasswordInput";

const USERS_PER_PAGE = 5;
const INITIAL_FORM = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "citizen",
};
const EMPTY_EDIT_FORM = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "citizen",
};

export default function AdminCreateUser() {
  const { user: currentUser, syncUser } = useAuth();
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState("");
  const [createdUser, setCreatedUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [usersPage, setUsersPage] = useState(1);
  const [usersRefresh, setUsersRefresh] = useState(0);
  const [usersResult, setUsersResult] = useState({
    items: [],
    total: 0,
    page: 1,
    pages: 1,
  });
  const [usersError, setUsersError] = useState("");
  const [usersLoading, setUsersLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [usersNotice, setUsersNotice] = useState("");

  useEffect(() => {
    let ignore = false;
    setUsersLoading(true);
    setUsersError("");
    api(`/admin/users?page=${usersPage}`)
      .then((result) => {
        if (!ignore) setUsersResult(result);
      })
      .catch((err) => {
        if (!ignore) setUsersError(err.message);
      })
      .finally(() => {
        if (!ignore) setUsersLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [usersPage, usersRefresh]);

  const update = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
    setError("");
    setCreatedUser(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setCreatedUser(null);
    setSaving(true);
    try {
      const { user } = await api("/admin/users", {
        method: "POST",
        body: form,
      });
      setCreatedUser(user);
      setForm(INITIAL_FORM);
      setUsersPage(1);
      setUsersRefresh((current) => current + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const beginEdit = (account) => {
    setEditingUserId(account.id);
    setEditForm({
      name: account.name,
      email: account.email,
      phone: account.phone || "",
      password: "",
      role: account.role,
    });
    setEditError("");
    setUsersNotice("");
  };

  const updateEditForm = (event) => {
    setEditForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
    setEditError("");
  };

  const saveUser = async (event) => {
    event.preventDefault();
    setEditError("");
    setEditSaving(true);
    try {
      const { user: updatedUser } = await api(`/admin/users/${editingUserId}`, {
        method: "PATCH",
        body: editForm,
      });
      syncUser(updatedUser);
      setEditingUserId(null);
      setEditForm(EMPTY_EDIT_FORM);
      setUsersNotice(`Updated ${updatedUser.name}'s account.`);
      setUsersRefresh((current) => current + 1);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSaving(false);
    }
  };

  const deleteUser = async (account) => {
    const confirmed = window.confirm(
      `Delete ${account.name} (${account.email})?\n\nThis permanently removes the account and all of their submitted requests and request history.`,
    );
    if (!confirmed) return;

    setDeletingUserId(account.id);
    setUsersError("");
    setUsersNotice("");
    try {
      await api(`/admin/users/${account.id}`, { method: "DELETE" });
      if (editingUserId === account.id) setEditingUserId(null);
      setUsersNotice(`Deleted ${account.name}'s account and associated requests.`);
      if (usersResult.items.length === 1 && usersPage > 1) {
        setUsersPage((page) => page - 1);
      } else {
        setUsersRefresh((current) => current + 1);
      }
    } catch (err) {
      setUsersError(err.message);
    } finally {
      setDeletingUserId(null);
    }
  };

  return (
    <div className="admin-create-user-page">
      <Link
        to="/admin"
        className="btn btn--ghost btn--sm admin-create-user__back"
      >
        ← Back to dashboard
      </Link>
      <section className="card admin-create-user">
        <div className="admin-create-user__heading">
          <span className="admin-create-user__icon" aria-hidden="true">
            ＋
          </span>
          <div>
            <h1>Add a user</h1>
            <p className="muted">
              Create a citizen account or grant administrator access.
            </p>
          </div>
        </div>

        <form className="admin-user-form" onSubmit={submit}>
          <label className="field">
            <span>Full name</span>
            <input
              name="name"
              required
              minLength="2"
              maxLength="100"
              autoComplete="name"
              value={form.name}
              onChange={update}
              placeholder="e.g. Amina Otieno"
            />
          </label>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={update}
              placeholder="name@example.com"
            />
          </label>
          <label className="field">
            <span>Phone number</span>
            <input
              type="tel"
              name="phone"
              required
              maxLength="20"
              autoComplete="tel"
              value={form.phone}
              onChange={update}
              placeholder="+254 712 345 678"
            />
          </label>
          <label className="field">
            <span>Temporary password</span>
            <PasswordInput
              id="admin-create-user-password"
              name="password"
              required
              minLength="8"
              autoComplete="new-password"
              value={form.password}
              onChange={update}
              placeholder="At least 8 characters"
            />
          </label>
          <label className="field">
            <span>Account type</span>
            <select name="role" value={form.role} onChange={update}>
              <option value="citizen">Citizen</option>
              <option value="admin">Administrator</option>
            </select>
          </label>
          <div className="admin-user-form__submit">
            <button className="btn btn--primary" disabled={saving}>
              {saving ? "Creating account…" : "Create account"}
            </button>
          </div>
        </form>

        {error && (
          <p className="alert alert--error" role="alert">
            {error}
          </p>
        )}
        {createdUser && (
          <p className="alert alert--success" role="status">
            {createdUser.role === "admin" ? "Administrator" : "Citizen"} account
            created for <strong>{createdUser.name}</strong> ({createdUser.email}
            ).
          </p>
        )}
        <p className="admin-create-user__note muted small">
          Share the temporary password securely. Passwords are stored as hashes
          and cannot be viewed later.
        </p>
      </section>

      <section className="card admin-users">
        <div className="admin-users__heading">
          <div>
            <p className="admin-users__eyebrow">ACCOUNT DIRECTORY</p>
            <h2>Users &amp; Access</h2>
            <p className="muted">
              Review who can use the portal and what they can do.
            </p>
          </div>
          <span className="admin-users__total">{usersResult.total} total</span>
        </div>

        {usersError && (
          <p className="alert alert--error" role="alert">
            {usersError}
          </p>
        )}
        {usersNotice && (
          <p className="alert alert--success" role="status">
            {usersNotice}
          </p>
        )}
        {usersLoading ? (
          <p className="muted center pad">Loading accounts…</p>
        ) : usersResult.items.length === 0 ? (
          <div className="admin-users__empty">
            <span aria-hidden="true">👥</span>
            <p>No accounts to show yet.</p>
          </div>
        ) : (
          <div className="admin-users__list" aria-busy={usersLoading}>
            {usersResult.items.map((account) => (
              <Fragment key={account.id}>
              <article className="admin-user-row" key={account.id}>
                <span
                  className={`admin-user-row__avatar ${account.role === "admin" ? "is-admin" : ""}`}
                  aria-hidden="true"
                >
                  {account.name.trim().charAt(0).toUpperCase()}
                </span>
                <div className="admin-user-row__identity">
                  <strong>{account.name}</strong>
                  <span>{account.email}</span>
                  {account.phone && <small>{account.phone}</small>}
                </div>
                <span
                  className={`admin-user-role admin-user-role--${account.role}`}
                >
                  {account.role === "admin" ? "Administrator" : "Citizen"}
                </span>
                <div className="admin-user-row__actions">
                  <button
                    className="btn btn--manage btn--sm"
                    type="button"
                    onClick={() =>
                      editingUserId === account.id
                        ? setEditingUserId(null)
                        : beginEdit(account)
                    }
                    aria-expanded={editingUserId === account.id}
                  >
                    {editingUserId === account.id ? "Close" : "Edit"}
                  </button>
                  <button
                    className="btn btn--danger btn--sm"
                    type="button"
                    disabled={
                      account.id === currentUser.id || deletingUserId !== null
                    }
                    title={
                      account.id === currentUser.id
                        ? "You cannot delete your own account"
                        : "Delete user"
                    }
                    onClick={() => deleteUser(account)}
                  >
                    {deletingUserId === account.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </article>
              {editingUserId === account.id && (
                <form
                  className="admin-user-edit"
                  onSubmit={saveUser}
                >
                  <div className="admin-user-edit__fields">
                    <label className="field">
                      <span>Full name</span>
                      <input
                        name="name"
                        required
                        minLength="2"
                        maxLength="100"
                        value={editForm.name}
                        onChange={updateEditForm}
                      />
                    </label>
                    <label className="field">
                      <span>Email</span>
                      <input
                        type="email"
                        name="email"
                        required
                        maxLength="191"
                        value={editForm.email}
                        onChange={updateEditForm}
                      />
                    </label>
                    <label className="field">
                      <span>Phone number</span>
                      <input
                        type="tel"
                        name="phone"
                        maxLength="20"
                        value={editForm.phone}
                        onChange={updateEditForm}
                        placeholder="Optional"
                      />
                    </label>
                    <label className="field">
                      <span>Account type</span>
                      <select
                        name="role"
                        value={editForm.role}
                        onChange={updateEditForm}
                        disabled={account.id === currentUser.id}
                      >
                        <option value="citizen">Citizen</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </label>
                    <label className="field admin-user-edit__password">
                      <span>New password (optional)</span>
                      <PasswordInput
                        id={`admin-edit-user-password-${account.id}`}
                        name="password"
                        minLength="8"
                        autoComplete="new-password"
                        value={editForm.password}
                        onChange={updateEditForm}
                        placeholder="Leave blank to keep current password"
                      />
                    </label>
                  </div>
                  {editError && (
                    <p className="alert alert--error" role="alert">
                      {editError}
                    </p>
                  )}
                  <div className="admin-user-edit__actions">
                    <button
                      className="btn btn--primary btn--sm"
                      disabled={editSaving}
                    >
                      {editSaving ? "Saving…" : "Save changes"}
                    </button>
                    <button
                      className="btn btn--ghost btn--sm"
                      type="button"
                      onClick={() => setEditingUserId(null)}
                      disabled={editSaving}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
              </Fragment>
            ))}
          </div>
        )}

        {usersResult.pages > 1 && !usersLoading && (
          <nav
            className="admin-users__pagination"
            aria-label="User list pagination"
          >
            <span className="muted small">
              Page {usersResult.page} of {usersResult.pages}
              <span className="admin-users__page-hint">
                {" "}
                · {USERS_PER_PAGE} accounts per page
              </span>
            </span>
            <div className="pager__controls">
              <button
                className="btn btn--ghost btn--sm"
                disabled={usersPage <= 1}
                onClick={() => setUsersPage((page) => page - 1)}
              >
                ← Previous
              </button>
              <button
                className="btn btn--manage btn--sm"
                disabled={usersPage >= usersResult.pages}
                onClick={() => setUsersPage((page) => page + 1)}
              >
                Next →
              </button>
            </div>
          </nav>
        )}
      </section>
    </div>
  );
}
