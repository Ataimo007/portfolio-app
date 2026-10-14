"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
export default function SignupForm({
  initialMode = "signup",
}: {
  initialMode?: "signup" | "resend";
}) {
  const host = useRef<HTMLDivElement>(null),
    form = useRef<HTMLFormElement>(null);
  const [mode, setMode] = useState<"signup" | "resend">(initialMode),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  useEffect(() => {
    let stopped = false;
    const container = host.current;
    import("altcha")
      .then(() => {
        if (stopped || !container) return;
        const widget = document.createElement("altcha-widget");
        widget.setAttribute("challenge", "/api/auth/registration/challenge");
        widget.setAttribute("name", "altcha");
        widget.addEventListener("verified", () => setReady(true));
        widget.addEventListener("statechange", () => {
          if (widget.getState() !== "verified") setReady(false);
        });
        container.replaceChildren(widget);
      })
      .catch(() =>
        setError(
          "The verification check could not load. Refresh this page to try again.",
        ),
      );
    return () => {
      stopped = true;
      container?.replaceChildren();
    };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget));
      const response = await fetch("/api/auth/registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, action: mode }),
      });
      const value = await response.json();
      if (!response.ok)
        throw Error(value.error || "Account request could not be completed.");
      setSuccess(value.message);
      form.current?.reset();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Connection failed. Please try again.",
      );
    } finally {
      setBusy(false);
      setReady(false);
      host.current?.querySelector("altcha-widget")?.reset();
    }
  }
  return (
    <section className="signup-panel" aria-labelledby="signup-heading">
      <h2 id="signup-heading">
        {mode === "signup" ? "Create your account" : "Verify your email"}
      </h2>
      <p>
        {mode === "signup"
          ? "A private workspace for consultations and conversations. Check your email to verify ownership and choose your password."
          : "Request a new verification link. For security, repeat requests are limited."}
      </p>
      <form className="contact-form" onSubmit={submit} ref={form}>
        {mode === "signup" && (
          <div className="form-row">
            <label>
              First name
              <input
                name="firstName"
                autoComplete="given-name"
                required
                maxLength={80}
              />
            </label>
            <label>
              Last name
              <input
                name="lastName"
                autoComplete="family-name"
                required
                maxLength={80}
              />
            </label>
          </div>
        )}
        <label>
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </label>
        <div className="signup-honeypot" aria-hidden="true">
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <div
          ref={host}
          className="signup-challenge"
          aria-label="Registration verification"
        />
        <button className="button primary" disabled={!ready || busy}>
          {busy
            ? "Please wait…"
            : mode === "signup"
              ? "Create account"
              : "Send verification link"}
        </button>
        {error && (
          <p role="alert" className="portal-error">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="portal-success">
            {success}
          </p>
        )}
      </form>
      <div className="signup-links">
        <Link href="/login">Already have an account? Sign in</Link>
        <button
          className="text-link"
          type="button"
          disabled={busy}
          onClick={() => {
            setMode(mode === "signup" ? "resend" : "signup");
            setSuccess("");
            setError("");
            setReady(false);
            form.current?.reset();
            host.current?.querySelector("altcha-widget")?.reset();
          }}
        >
          {mode === "signup"
            ? "Resend a verification email"
            : "Create a new account"}
        </button>
      </div>
      <p className="signup-terms">
        By creating an account, you agree to the{" "}
        <Link href="/terms">terms</Link> and{" "}
        <Link href="/privacy">privacy policy</Link>.
      </p>
    </section>
  );
}
