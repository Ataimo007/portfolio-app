"use client";
import { useState } from "react";
import { Download, Check } from "lucide-react";
import { usePwaInstall } from "./pwa-install-provider";
export default function PublicInstall() {
  const { installed, install } = usePwaInstall();
  const [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState("");
  if (installed) return null;
  return (
    <section className="workspace-panel public-install">
      <p className="eyebrow">Available to everyone</p>
      <h2>
        {installed
          ? "Ataimo is on your home screen."
          : "A place on your home screen."}
      </h2>
      <p>
        Browse the portfolio without an account. Sign in when you’re ready to
        book a consultation or use private conversations.
      </p>
      <button
        className="button primary"
        disabled={busy || installed}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            setStatus(await install());
          } catch {
            setError(
              "Installation couldn’t start. Try your browser’s Install app or Add to Home Screen option.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {installed ? <Check size={18} /> : <Download size={18} />}{" "}
        {installed
          ? "App installed"
          : busy
            ? "Opening installation…"
            : "Install Ataimo"}
      </button>
      {status && (
        <p className="portal-success" role="status">
          {status}
        </p>
      )}
      {error && (
        <p className="portal-error" role="alert">
          {error}
        </p>
      )}
      <div className="install-instructions">
        <section>
          <h3>iPhone & iPad</h3>
          <p>
            Open ataimo.com in Safari. Tap Share, choose Add to Home Screen,
            then Add. Open Ataimo from its new icon.
          </p>
        </section>
        <section>
          <h3>Android</h3>
          <p>
            Open ataimo.com in Chrome. Tap Install Ataimo above, or choose
            Install app from the browser menu.
          </p>
        </section>
      </div>
      <p className="portal-note">
        Installation does not require login. Private chat, mailbox access and
        device notifications require an authorized account. Enable notifications
        from Profile after signing in.
      </p>
    </section>
  );
}
