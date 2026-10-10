"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
export default function AccountVerification() {
  const [token, setToken] = useState(""),
    [purpose, setPurpose] = useState(""),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const value = new URLSearchParams(location.search).get("token") || "";
    const timer = setTimeout(async () => {
      history.replaceState(null, "", location.pathname);
      setToken(value);
      try {
        const r = await fetch("/api/auth/account/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: value, inspect: true }),
          signal: controller.signal,
        });
        const data = await r.json();
        if (!r.ok) throw Error(data.error);
        setPurpose(data.purpose);
      } catch (e) {
        if (!controller.signal.aborted) setError((e as Error).message);
      }
    }, 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);
  return (
    <div className="page portal-page account-verification">
      <h1>
        {purpose === "delete"
          ? "Confirm account deletion"
          : "Reset your password"}
      </h1>
      {success ? (
        <>
          <p role="status" className="portal-success">
            {success}
          </p>
          <Link href="/login" className="button primary">
            Return to sign in
          </Link>
        </>
      ) : (
        <>
          {error && (
            <p role="alert" className="portal-error">
              {error}
            </p>
          )}
          {!purpose && !error && (
            <p role="status">Checking your verification link…</p>
          )}
          {purpose && (
            <form
              className="portal-form workspace-panel"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                if (
                  purpose === "password" &&
                  form.get("password") !== form.get("repeat")
                ) {
                  setError("The passwords do not match.");
                  return;
                }
                setBusy(true);
                setError("");
                try {
                  const r = await fetch("/api/auth/account/verify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      token,
                      password: form.get("password") || undefined,
                      confirm: form.get("confirm") || undefined,
                    }),
                  });
                  const data = await r.json();
                  if (!r.ok) throw Error(data.error);
                  setSuccess(data.message);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {purpose === "password" ? (
                <>
                  <p>
                    Choose a password with at least 12 characters. Changing it
                    signs out your existing sessions.
                  </p>
                  <label htmlFor="new-password">New password</label>
                  <input
                    id="new-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={128}
                    required
                  />
                  <label htmlFor="repeat-password">Confirm password</label>
                  <input
                    id="repeat-password"
                    name="repeat"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={128}
                    required
                  />
                </>
              ) : (
                <>
                  <p>
                    This permanently removes your sign-in identity and personal
                    profile details. Historical consultation records are
                    retained under Deleted account. This cannot be undone.
                  </p>
                  <label htmlFor="delete-confirm">Type DELETE to confirm</label>
                  <input
                    id="delete-confirm"
                    name="confirm"
                    pattern="DELETE"
                    autoComplete="off"
                    required
                  />
                </>
              )}
              <button className="button primary" disabled={busy}>
                {busy
                  ? "Updating…"
                  : purpose === "password"
                    ? "Save new password"
                    : "Permanently delete account"}
              </button>
            </form>
          )}
          <Link href="/portal?view=accounts" className="text-link">
            Back to Accounts
          </Link>
        </>
      )}
    </div>
  );
}
