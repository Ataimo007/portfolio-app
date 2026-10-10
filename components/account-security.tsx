"use client";
import { useCallback, useEffect, useState } from "react";
import { Laptop, Link2, LockKeyhole, Trash2 } from "lucide-react";
type Details = {
  firstName: string;
  lastName: string;
  hasPassword: boolean;
  sessions: {
    id: string;
    ip: string;
    startedAt: string;
    lastAccess: string;
    current: boolean;
    applications: string[];
  }[];
  linked: { identityProvider: string; userName: string }[];
  providers: string[];
};
const names: Record<string, string> = {
  google: "Google",
  github: "GitHub",
  linkedin: "LinkedIn",
  microsoft: "Microsoft",
};
export default function AccountSecurity({
  readOnly,
  isOwner,
  onUpdated,
}: {
  readOnly: boolean;
  isOwner: boolean;
  onUpdated: () => void;
}) {
  const [details, setDetails] = useState<Details | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/account", { cache: "no-store" });
      const value = await r.json();
      if (!r.ok) throw Error(value.error);
      setDetails(value);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  async function action(value: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/auth/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      if (data.redirect) {
        location.assign(data.redirect);
        return;
      }
      setNotice(data.message);
      await load();
      onUpdated();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="account-security">
      {error && (
        <p role="alert" className="portal-error">
          {error}{" "}
          <button
            className="portal-inline"
            onClick={() => {
              setError("");
              void load();
            }}
          >
            Retry
          </button>
        </p>
      )}
      {notice && (
        <p role="status" className="portal-success">
          {notice}
          <button
            className="portal-inline"
            aria-label="Dismiss account confirmation"
            onClick={() => setNotice("")}
          >
            Dismiss
          </button>
        </p>
      )}
      {!details ? (
        !error && <p role="status">Loading account details…</p>
      ) : (
        <>
          <section className="workspace-panel">
            <h3>Personal information</h3>
            <p>Your name is shared in consultations and conversations.</p>
            <form
              className="portal-form"
              onSubmit={(event) => {
                event.preventDefault();
                const values = new FormData(event.currentTarget);
                void action({
                  action: "personal",
                  firstName: values.get("firstName"),
                  lastName: values.get("lastName"),
                });
              }}
            >
              <fieldset disabled={busy || readOnly} className="account-fields">
                <div>
                  <label htmlFor="account-first-name">First name</label>
                  <input
                    id="account-first-name"
                    name="firstName"
                    defaultValue={details.firstName}
                    required
                    maxLength={100}
                    autoComplete="given-name"
                  />
                </div>
                <div>
                  <label htmlFor="account-last-name">Last name</label>
                  <input
                    id="account-last-name"
                    name="lastName"
                    defaultValue={details.lastName}
                    maxLength={100}
                    autoComplete="family-name"
                  />
                </div>
              </fieldset>
              <button className="button" disabled={busy || readOnly}>
                Update personal information
              </button>
            </form>
          </section>
          <section className="workspace-panel">
            <h3>
              <LockKeyhole size={20} /> Password & security
            </h3>
            <p>
              {details.hasPassword
                ? "Request a single-use verification email, then choose a new password inside the app."
                : "Your password is managed by your social sign-in provider. No separate app password is needed."}
            </p>
            <button
              className="button"
              disabled={busy || readOnly || !details.hasPassword}
              onClick={() => void action({ action: "reset-password" })}
            >
              Reset password
            </button>
          </section>
          <section className="workspace-panel">
            <h3>
              <Laptop size={20} /> Signed-in devices
            </h3>
            <p>
              Active identity sessions. IP addresses can represent a shared
              network or VPN.
            </p>
            <ul className="account-list">
              {details.sessions.map((s) => (
                <li key={s.id}>
                  <div>
                    <strong>
                      {s.current ? "This device" : "Signed-in device"}
                    </strong>
                    <span>
                      {s.ip} · {s.applications.join(", ") || "Ataimo"}
                    </span>
                    <span>
                      Last active {new Date(s.lastAccess).toLocaleString()}
                    </span>
                    <span>
                      Signed in {new Date(s.startedAt).toLocaleString()}
                    </span>
                  </div>
                  <button
                    className="button"
                    disabled={busy || readOnly}
                    onClick={() =>
                      void action({ action: "revoke-device", id: s.id })
                    }
                  >
                    Sign out device
                  </button>
                </li>
              ))}
            </ul>
            {!details.sessions.length && (
              <p>
                No active identity sessions. Refresh your sign-in to see device
                activity.
              </p>
            )}
          </section>
          <section className="workspace-panel">
            <h3>
              <Link2 size={20} /> Linked accounts
            </h3>
            <p>
              Connect another sign-in method. The provider asks you to confirm
              ownership, then returns you here.
            </p>
            <ul className="account-list">
              {details.providers.map((provider) => {
                const linked = details.linked.find(
                  (l) => l.identityProvider === provider,
                );
                return (
                  <li key={provider}>
                    <div>
                      <strong>{names[provider]}</strong>
                      <span>
                        {linked
                          ? linked.userName || "Connected"
                          : "Not connected"}
                      </span>
                    </div>
                    <button
                      className="button"
                      disabled={busy || readOnly}
                      onClick={() =>
                        void action({
                          action: linked ? "unlink" : "link",
                          provider,
                        })
                      }
                    >
                      {linked ? "Unlink" : "Link account"}
                    </button>
                  </li>
                );
              })}
            </ul>
            {!details.providers.length && (
              <p>Social sign-in methods are temporarily unavailable.</p>
            )}
          </section>
          <section className="workspace-panel account-danger">
            <h3>
              <Trash2 size={20} /> Delete account
            </h3>
            <p>
              {isOwner
                ? "Your owner account is protected from deletion here."
                : "Request email verification to permanently delete your sign-in identity and personal profile. Historical consultation records remain under Deleted account."}
            </p>
            <button
              className="button"
              disabled={busy || readOnly || isOwner}
              onClick={() => void action({ action: "delete-account" })}
            >
              Request account deletion
            </button>
          </section>
        </>
      )}
    </div>
  );
}
