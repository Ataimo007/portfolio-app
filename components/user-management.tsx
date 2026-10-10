"use client";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, MessageSquare, Search, Users } from "lucide-react";
type Person = {
  id: string;
  name: string;
  email: string;
  enabled: boolean;
  status: string;
};
type Details = {
  user: Person;
  sessions: { ip: string; lastAccess: number }[];
  events: { type: string; time: number; ip?: string }[];
  jobs: { id: string; title: string; status: string }[];
  activity: { action: string; created_at: string }[];
};
export default function UserManagement({
  onChat,
  onConsultation,
}: {
  onChat: (id: string) => void;
  onConsultation: (id: string) => void;
}) {
  const [users, setUsers] = useState<Person[]>([]),
    [selected, setSelected] = useState<Details | null>(null),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [first, setFirst] = useState(0),
    [more, setMore] = useState(false),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [confirm, setConfirm] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(
        "/api/portal/users?" +
          new URLSearchParams({ search: query, first: String(first) }),
        { cache: "no-store" },
      );
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setUsers(data.users);
      setMore(data.hasMore);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [first, query]);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  async function open(id: string) {
    setBusy(true);
    setError("");
    setConfirm("");
    try {
      const r = await fetch("/api/portal/users?id=" + id, {
        cache: "no-store",
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setSelected(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function action(action: string) {
    if (!selected) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/portal/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.user.id,
          action,
          confirmation: confirm,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setNotice(data.message);
      if (data.conversationId) onChat(data.conversationId);
      else if (action === "delete") {
        setSelected(null);
        await load();
      } else {
        await open(selected.user.id);
        await load();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="user-management" aria-labelledby="users-heading">
      <div className="portal-section-heading">
        <h2 id="users-heading">
          <Users size={24} /> Users
        </h2>
        {selected && (
          <button className="button" onClick={() => setSelected(null)}>
            <ArrowLeft size={16} /> All users
          </button>
        )}
      </div>
      {error && (
        <p className="portal-error" role="alert">
          {error}
          <button className="portal-inline" onClick={() => void load()}>
            Retry
          </button>
        </p>
      )}
      {notice && (
        <p className="portal-success" role="status">
          {notice}
        </p>
      )}
      {!selected ? (
        <>
          <form
            className="user-search"
            onSubmit={(e) => {
              e.preventDefault();
              setFirst(0);
              setQuery(search);
            }}
          >
            <label className="sr-only" htmlFor="user-search">
              Search users
            </label>
            <input
              id="user-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email"
              maxLength={200}
            />
            <button className="button">
              <Search size={16} /> Search
            </button>
          </form>
          {loading && <p role="status">Loading users…</p>}
          <ul className="user-directory">
            {users.map((p) => (
              <li key={p.id}>
                <button disabled={busy} onClick={() => void open(p.id)}>
                  <span>
                    <strong>{p.name}</strong>
                    <span>{p.email}</span>
                  </span>
                  <span className="portal-state">{p.status}</span>
                </button>
              </li>
            ))}
          </ul>
          {!loading && !users.length && <p>No users match this search.</p>}
          <div className="portal-job-actions">
            <button
              className="button"
              disabled={!first || loading}
              onClick={() => setFirst(Math.max(0, first - 30))}
            >
              Previous
            </button>
            <button
              className="button"
              disabled={!more || loading}
              onClick={() => setFirst(first + 30)}
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <div className="user-detail">
          <header>
            <h3>{selected.user.name}</h3>
            <p>
              {selected.user.email} · {selected.user.status}
            </p>
          </header>
          <div className="portal-job-actions">
            <button
              className="button primary"
              disabled={busy || !selected.user.enabled}
              onClick={() => void action("chat")}
            >
              <MessageSquare size={16} /> Open chat history
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() =>
                void action(selected.user.enabled ? "disable" : "enable")
              }
            >
              {selected.user.enabled ? "Disable account" : "Reopen account"}
            </button>
            <button
              className="button"
              disabled={busy || selected.user.status === "closed"}
              onClick={() => void action("close")}
            >
              Close account
            </button>
          </div>
          <section>
            <h3>Consultations</h3>
            {selected.jobs.length ? (
              <ul className="account-list">
                {selected.jobs.map((j) => (
                  <li key={j.id}>
                    <div>
                      <strong>{j.title}</strong>
                      <span>{j.status}</span>
                    </div>
                    <button
                      className="button"
                      onClick={() => onConsultation(j.id)}
                    >
                      View consultation
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No consultation work yet.</p>
            )}
          </section>
          <section>
            <h3>Signed-in devices</h3>
            {selected.sessions.length ? (
              selected.sessions.map((s, i) => (
                <p key={i}>
                  {s.ip} · Last active {new Date(s.lastAccess).toLocaleString()}
                </p>
              ))
            ) : (
              <p>No active sessions.</p>
            )}
          </section>
          <section>
            <h3>Activity</h3>
            <ul className="account-list">
              {selected.events.map((e, i) => (
                <li key={i}>
                  <div>
                    <strong>{e.type.replaceAll("_", " ").toLowerCase()}</strong>
                    <span>
                      {new Date(e.time).toLocaleString()} · {e.ip}
                    </span>
                  </div>
                </li>
              ))}
              {selected.activity.map((a, i) => (
                <li key={"audit" + i}>
                  <div>
                    <strong>{a.action.replaceAll(".", " ")}</strong>
                    <span>{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                </li>
              ))}
            </ul>
            {!selected.events.length && !selected.activity.length && (
              <p>No recorded activity yet.</p>
            )}
          </section>
          <details className="account-danger">
            <summary>Permanently delete this user</summary>
            <p>
              Deletes the sign-in identity and personal profile. Consultation
              history is retained under Deleted account. Closing an account
              retains its profile and can be reversed.
            </p>
            <label htmlFor="user-delete-confirm">
              Enter {selected.user.email} to confirm
            </label>
            <input
              id="user-delete-confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
            />
            <button
              className="button"
              disabled={
                busy || !selected.user.email || confirm !== selected.user.email
              }
              onClick={() => void action("delete")}
            >
              Permanently delete user
            </button>
          </details>
        </div>
      )}
    </section>
  );
}
