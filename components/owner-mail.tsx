"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Mail, RefreshCw, Send } from "lucide-react";
type Email = {
  uid: number;
  uidValidity: string;
  subject: string;
  from: string;
  date?: string;
  unread?: boolean;
  replyTo?: string;
  text?: string;
  attachments?: { name: string; size: number }[];
};
export default function OwnerMail() {
  const [folder, setFolder] = useState("inbox"),
    [messages, setMessages] = useState<Email[]>([]),
    [selected, setSelected] = useState<Email | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [to, setTo] = useState(""),
    [subject, setSubject] = useState(""),
    [text, setText] = useState("");
  const nonce = useRef<string | null>(null);
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const r = await fetch(`/api/portal/mail?folder=${folder}`, {
          cache: "no-store",
          signal,
        });
        const data = await r.json();
        if (!r.ok) throw Error(data.error);
        setMessages(data.messages);
        setError("");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [folder],
  );
  useEffect(() => {
    const controller = new AbortController();
    const initial = setTimeout(() => refresh(controller.signal), 0);
    const timer = setInterval(() => {
      if (!document.hidden) refresh(controller.signal);
    }, 60000);
    return () => {
      clearTimeout(initial);
      controller.abort();
      clearInterval(timer);
    };
  }, [refresh]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  async function open(email: Email) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(
        `/api/portal/mail?folder=${folder}&uid=${email.uid}&validity=${email.uidValidity}`,
        { cache: "no-store" },
      );
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setSelected(data);
      setMessages((old) =>
        old.map((m) => (m.uid === email.uid ? { ...m, unread: false } : m)),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function send(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    nonce.current ||= crypto.randomUUID();
    try {
      const r = await fetch("/api/portal/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nonce: nonce.current, to, subject, text }),
      });
      const value = await r.json();
      if (!r.ok) throw Error(value.error);
      setNotice(value.message);
      setText("");
      setSubject("");
      setTo("");
      nonce.current = null;
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="workspace-panel owner-mail">
      <div className="portal-section-heading">
        <div>
          <h2>
            <Mail size={24} />
            Your mailbox
          </h2>
          <p>
            Connected to your existing mail account. Inbox updates every minute
            while this page is open.
          </p>
        </div>
        <button
          className="button"
          disabled={loading || busy}
          onClick={() => refresh()}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      <nav
        className="mailbox-tabs"
        role="tablist"
        aria-label="Mailbox folders"
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
            return;
          event.preventDefault();
          const next =
            event.key === "Home"
              ? "inbox"
              : event.key === "End"
                ? "sent"
                : folder === "inbox"
                  ? "sent"
                  : "inbox";
          setFolder(next);
          setSelected(null);
          document.getElementById("mail-tab-" + next)?.focus();
        }}
      >
        {["inbox", "sent"].map((view) => (
          <button
            id={"mail-tab-" + view}
            role="tab"
            tabIndex={folder === view ? 0 : -1}
            aria-controls="mailbox-panel"
            key={view}
            aria-selected={folder === view}
            onClick={() => {
              setFolder(view);
              setSelected(null);
            }}
          >
            {view === "inbox" ? "Inbox" : "Sent"}
          </button>
        ))}
      </nav>
      {error && (
        <p className="portal-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="portal-success" role="status">
          {notice}
        </p>
      )}
      <div
        id="mailbox-panel"
        className="workspace-mail-grid"
        role="tabpanel"
        aria-labelledby={"mail-tab-" + folder}
        tabIndex={0}
      >
        <div className="workspace-mail-list" aria-label="Email messages">
          {loading && <p role="status">Loading mail…</p>}
          {!loading && !messages.length && !error && (
            <p>Your {folder} is empty.</p>
          )}
          {messages.map((email) => (
            <button
              className="workspace-email"
              key={email.uid}
              disabled={busy}
              onClick={() => open(email)}
              aria-pressed={selected?.uid === email.uid}
            >
              <span>
                {email.from}
                {email.unread ? " · Unread" : ""}
              </span>
              <strong>{email.subject}</strong>
              <time>
                {email.date ? new Date(email.date).toLocaleString() : ""}
              </time>
            </button>
          ))}
        </div>
        <div>
          {selected ? (
            <article className="workspace-email-reader">
              <h3>{selected.subject}</h3>
              <p>{selected.from}</p>
              <p className="workspace-mail-text">{selected.text}</p>
              {Boolean(selected.attachments?.length) && (
                <p className="portal-note">
                  Attachments:{" "}
                  {selected.attachments!.map((a) => a.name).join(", ")}. Open
                  attachments in your mail client.
                </p>
              )}
              <button
                className="button"
                onClick={() => {
                  setTo(selected.replyTo || "");
                  setSubject(
                    /^Re:/i.test(selected.subject)
                      ? selected.subject
                      : `Re: ${selected.subject}`,
                  );
                  nonce.current = null;
                  document.getElementById("mail-body")?.focus();
                }}
              >
                Reply
              </button>
            </article>
          ) : (
            <div className="portal-empty">
              <h3>Select an email.</h3>
              <p>
                Messages display as plain text for a clean, safe reading
                experience.
              </p>
            </div>
          )}
          <form className="portal-form" onSubmit={send}>
            <h3>Write an email</h3>
            <label htmlFor="mail-to">To</label>
            <input
              id="mail-to"
              type="email"
              required
              maxLength={254}
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                nonce.current = null;
              }}
            />
            <label htmlFor="mail-subject">Subject</label>
            <input
              id="mail-subject"
              required
              maxLength={200}
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                nonce.current = null;
              }}
            />
            <label htmlFor="mail-body">Message</label>
            <textarea
              id="mail-body"
              required
              maxLength={8000}
              rows={6}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                nonce.current = null;
              }}
            />
            <button className="button primary" disabled={busy}>
              <Send size={16} />
              {busy ? "Sending…" : "Send email"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
