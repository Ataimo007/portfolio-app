"use client";
import { useEffect, useState } from "react";
import { usePwaInstall } from "./pwa-install-provider";
import { Bell, Download } from "lucide-react";
export default function WorkspaceDevice() {
  const { installed, install } = usePwaInstall();
  const [enabled, setEnabled] = useState(false),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker
        .getRegistration()
        .then((r) => r?.pushManager.getSubscription())
        .then(async (subscription) => {
          if (!subscription) return;
          const response = await fetch("/api/portal/push", {
            cache: "no-store",
          });
          if (response.ok) {
            const value = await response.json();
            setEnabled(value.endpoints.includes(subscription.endpoint));
          }
        })
        .catch(() => {});
  }, []);
  async function notifications() {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      )
        throw Error(
          "Install this app from Safari’s Share menu on iPhone, then enable notifications. Your browser must support Web Push.",
        );
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                Error("The app service is not ready. Reload and try again."),
              ),
            8000,
          ),
        ),
      ]);
      const existing = await registration.pushManager.getSubscription();
      if (enabled && existing) {
        const r = await fetch("/api/portal/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
        if (!r.ok) throw Error("Could not disable notifications. Try again.");
        await existing.unsubscribe();
        setEnabled(false);
        setStatus("Notifications disabled on this device.");
        return;
      }
      const response = await fetch("/api/portal/push", { cache: "no-store" });
      const config = await response.json();
      if (!response.ok || !config.available)
        throw Error("Phone notifications are not configured yet.");
      if ((await Notification.requestPermission()) !== "granted")
        throw Error(
          "Notifications are blocked. Allow them in your browser or phone settings, then try again.",
        );
      const padding = "=".repeat((4 - (config.publicKey.length % 4)) % 4);
      const bytes = Uint8Array.from(
        atob(
          (config.publicKey + padding).replace(/-/g, "+").replace(/_/g, "/"),
        ),
        (c) => c.charCodeAt(0),
      );
      const subscription =
        existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: bytes,
        }));
      const saved = await fetch("/api/portal/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      const value = await saved.json();
      if (!saved.ok) throw Error(value.error);
      setEnabled(true);
      setStatus(value.message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="workspace-panel">
      <p className="eyebrow">On your phone</p>
      <h2>Your workspace, within reach.</h2>
      <p>
        Install Ataimo for quick access to consultations and conversations.
        Notifications contain no private message content.
      </p>
      <div className="portal-job-actions">
        {!installed && (
          <button
            className="button"
            onClick={async () => {
              setError("");
              try {
                setStatus(await install());
              } catch {
                setError(
                  "Installation could not start. Use your browser’s Add to Home Screen option.",
                );
              }
            }}
          >
            <Download size={16} />
            Install app
          </button>
        )}
        <button className="button" disabled={busy} onClick={notifications}>
          <Bell size={16} />
          {busy
            ? "Updating…"
            : enabled
              ? "Disable notifications"
              : "Enable notifications"}
        </button>
      </div>
      {installed && <p className="portal-note">Running as an installed app.</p>}
      {status && (
        <p role="status" className="portal-success">
          {status}
        </p>
      )}
      {error && (
        <p role="alert" className="portal-error">
          {error}
        </p>
      )}
    </section>
  );
}
