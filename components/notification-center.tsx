"use client";
import Link from "next/link";
import { Bell, Check, RefreshCw } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
type Item = {
  id: string;
  kind: string;
  title: string;
  url: string;
  created_at: string;
  read_at: string | null;
};
export const notificationLabels: Record<string, string> = {
  "account.login": "New sign-in",
  "message.created": "New private message",
  "booking.requested": "Consultation under review",
  "booking.approved": "Consultation booked",
  "booking.declined": "Consultation declined",
  "job.active": "Consultation in progress",
  "job.completed": "Consultation completed",
  "job.cancelled": "Consultation cancelled",
  "task.updated": "Task updated",
  "mail.received": "New email",
};
export default function NotificationCenter() {
  const root = useRef<HTMLDetailsElement>(null);
  const id = useId();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [state, setState] = useState("loading");
  const [saving, setSaving] = useState(false);
  async function refresh(signal?: AbortSignal) {
    try {
      const response = await fetch("/api/notifications", {
        cache: "no-store",
        signal,
      });
      if (!response.ok) throw Error();
      const data = await response.json();
      if (!signal?.aborted) {
        setItems(data.notifications);
        setUnread(data.unread);
        setState("success");
      }
    } catch {
      if (!signal?.aborted) setState("error");
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    const update = () => {
      if (!document.hidden) void refresh(controller.signal);
    };
    update();
    const timer = setInterval(update, 20000);
    const close = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node))
        root.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && root.current?.open) {
        root.current.open = false;
        root.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("visibilitychange", update);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  async function read(id?: string) {
    setSaving(true);
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { id } : {}),
      });
      if (!response.ok) throw Error();
      await refresh();
    } catch {
      setState("error");
    } finally {
      setSaving(false);
    }
  }
  return (
    <details
      ref={root}
      className="notification-center"
      onToggle={() => {
        setOpen(Boolean(root.current?.open));
        if (root.current?.open) void refresh();
      }}
    >
      <summary
        role="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={
          unread ? `Notifications, ${unread} unread` : "Notifications"
        }
      >
        <Bell size={20} aria-hidden="true" />
        {unread > 0 && (
          <span className="notification-count">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </summary>
      <section
        id={id}
        className="notification-panel"
        aria-label="Your notifications"
      >
        <div className="notification-heading">
          <h2>Notifications</h2>
          <button
            type="button"
            aria-label="Refresh notifications"
            disabled={saving}
            onClick={() => void refresh()}
          >
            <RefreshCw size={16} />
          </button>
        </div>
        {state === "loading" ? (
          <p role="status">Loading your updates…</p>
        ) : state === "error" ? (
          <p role="alert">
            Updates are temporarily unavailable.{" "}
            <button type="button" onClick={() => void refresh()}>
              Try again
            </button>
          </p>
        ) : (
          <>
            {unread > 0 && (
              <button
                className="text-link"
                type="button"
                disabled={saving}
                onClick={() => void read()}
              >
                <Check size={16} />
                {saving ? "Updating…" : "Mark all as read"}
              </button>
            )}
            {items.length === 0 ? (
              <p>
                You’re all caught up. New messages and consultation updates
                appear here.
              </p>
            ) : (
              <ul>
                {items.map((item) => (
                  <li key={item.id} data-unread={!item.read_at || undefined}>
                    <Link
                      href={item.url}
                      onClick={() => {
                        void read(item.id);
                        if (root.current) root.current.open = false;
                      }}
                    >
                      <strong>
                        {notificationLabels[item.kind] || "Workspace update"}
                      </strong>
                      <span>{item.title}</span>
                      <time dateTime={item.created_at}>
                        {new Date(item.created_at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </time>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </details>
  );
}
