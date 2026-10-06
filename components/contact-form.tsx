"use client";
import { useState } from "react";
export default function ContactForm() {
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <form
      className="contact-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setStatus("");
        const form = e.currentTarget;
        try {
          const response = await fetch("/api/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(Object.fromEntries(new FormData(form))),
          });
          const data = await response.json();
          setStatus(data.error || data.message);
          if (response.ok) form.reset();
        } catch {
          setStatus(
            "Connection failed. Please email contact@ataimo.com directly.",
          );
        } finally {
          setPending(false);
        }
      }}
    >
      <p className="form-note">
        You can always reach me directly by email. If form delivery is
        unavailable, this form will tell you.
      </p>
      <div className="form-row">
        <label>
          Name
          <input name="name" autoComplete="name" required maxLength={120} />
        </label>
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
      </div>
      <label>
        Company <span className="muted">(optional)</span>
        <input name="company" autoComplete="organization" maxLength={200} />
      </label>
      <label>
        Message
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
        />
      </label>
      <button className="button primary" disabled={pending}>
        {pending ? "Sending…" : "Send message ↗"}
      </button>
      <p role="status" aria-live="polite">
        {status}
      </p>
      <noscript>
        Please use the email link to get in touch. This form requires
        JavaScript.
      </noscript>
    </form>
  );
}
