"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import WorkspaceDevice from "./workspace-device";
import OwnerMail from "./owner-mail";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

type User = {
  clientId: string;
  name: string;
  email: string;
  timezone: string;
  company: string;
  phone: string;
  roles: string[];
  isOwner: boolean;
};
type Job = {
  id: string;
  title: string;
  description: string;
  status: string;
  client_name: string;
  booking_id: string;
  booking_status: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
  tasks: { id: string; title: string; completed: boolean }[];
  history: { id: string; status: string; created_at: string }[];
};
type Slot = { id: string; starts_at: string; ends_at: string };
type Message = {
  id: string;
  sequence: string;
  body: string;
  created_at: string;
  sender_name: string;
  mine: boolean;
};
type Data = {
  user: User;
  jobs: Job[];
  slots: Slot[];
  notifications: { id: string; kind: string; title: string }[];
};
const label = (value: string) =>
  value.replaceAll("-", " ").replaceAll(".", " ");
async function api(path: string, options?: RequestInit) {
  const response = await fetch(path, { ...options, cache: "no-store" });
  const value = await response.json();
  if (!response.ok)
    throw Object.assign(new Error(value.error || "Please try again."), {
      status: response.status,
    });
  return value;
}
function date(value: string, zone: string) {
  return new Intl.DateTimeFormat("en", {
    timeZone: zone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function Portal({
  authError,
  ownerOnly = false,
}: {
  authError?: string;
  ownerOnly?: boolean;
}) {
  const [section, setSection] = useState("overview");
  const [conversations, setConversations] = useState<
    { id: string; name: string; preview: string }[]
  >([]);
  const [data, setData] = useState<Data | null>(null),
    [loading, setLoading] = useState(true),
    [signedOut, setSignedOut] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("all"),
    [selected, setSelected] = useState(""),
    [messages, setMessages] = useState<Message[]>([]),
    [chatError, setChatError] = useState(""),
    [chatLoading, setChatLoading] = useState(false);
  const [month, setMonth] = useState(
      () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    ),
    [day, setDay] = useState(""),
    [slotId, setSlotId] = useState(""),
    [text, setText] = useState("");
  const notificationTarget = useRef("");
  const fetching = useRef(false),
    nonce = useRef<string | null>(null),
    chatEnd = useRef<HTMLDivElement>(null),
    followChat = useRef(true);
  const refresh = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      const [workspace, threads] = await Promise.all([
        api("/api/portal"),
        api("/api/portal/conversations"),
      ]);
      setData(workspace);
      setConversations(threads.conversations);
      const params = new URLSearchParams(window.location.search);
      const target =
        params.get("job") ||
        (params.get("conversation")
          ? "direct:" + params.get("conversation")
          : "");
      const navigationTarget =
        target ||
        (window.location.hash === "#mail" || params.get("view") === "mail"
          ? "mail"
          : "");
      if (navigationTarget && notificationTarget.current !== navigationTarget) {
        notificationTarget.current = navigationTarget;
        if (target) {
          setSelected(target);
          setSection("messages");
        } else if (workspace.user.isOwner) setSection("mail");
      }

      setSignedOut(false);
      setError("");
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 401) {
        setSignedOut(true);
        setData(null);
      } else setError(err.message);
    } finally {
      fetching.current = false;
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const initial = setTimeout(refresh, 0);
    const timer = setInterval(() => {
      if (!document.hidden) refresh();
    }, 10000);
    const visible = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh]);
  useEffect(() => {
    if (!selected) return;
    let disposed = false,
      fetching = false,
      last = "0";
    const controller = new AbortController();
    const load = async () => {
      if (fetching) return;
      fetching = true;
      try {
        const result = await api(
          `${selected.startsWith("direct:") ? "/api/portal/conversations/" + selected.slice(7) : "/api/portal/jobs/" + selected + "/messages"}?after=${last}`,
          { signal: controller.signal },
        );
        if (disposed) return;
        setMessages((old) =>
          [...old, ...result.messages]
            .filter((m, i, all) => all.findIndex((x) => x.id === m.id) === i)
            .slice(-500),
        );
        if (result.messages.length) last = result.messages.at(-1).sequence;
        setChatError("");
      } catch (e) {
        if (!disposed) setChatError((e as Error).message);
      } finally {
        fetching = false;
        if (!disposed) setChatLoading(false);
      }
    };
    load();
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, 3000);
    return () => {
      disposed = true;
      controller.abort();
      clearInterval(timer);
    };
  }, [selected]);
  useEffect(() => {
    const container = chatEnd.current?.parentElement;
    if (container && followChat.current)
      container.scrollTop = container.scrollHeight;
  }, [messages]);
  const action = async (input: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api("/api/portal/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      setNotice(result.message);
      await refresh();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  async function request(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    if (
      await action({
        action: "request",
        slotId,
        title: values.get("title"),
        description: values.get("description"),
      })
    ) {
      form.reset();
      setSlotId("");
    }
  }
  async function send(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    setChatError("");
    nonce.current ??= crypto.randomUUID();
    try {
      await api(
        selected.startsWith("direct:")
          ? "/api/portal/conversations/" + selected.slice(7)
          : `/api/portal/jobs/${selected}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: text, nonce: nonce.current }),
        },
      );
      setText("");
      nonce.current = null;
      setNotice("Message saved.");
    } catch (e) {
      setChatError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <div className="page portal-page" aria-busy="true">
        <h1>Your client workspace</h1>
        <p role="status">Connecting to your workspace…</p>
      </div>
    );
  if (signedOut)
    return (
      <div className="page portal-page">
        <div className="portal-intro">
          <ShieldCheck size={32} />
          <h1>
            A place to <em>work together.</em>
          </h1>
          <p>
            Request a consultation, follow your engagement, and keep our
            conversation in one private workspace.
          </p>
        </div>
        <section className="portal-login">
          <h2>Sign in to your workspace</h2>
          <p>
            Log in or create an account. Consultation times are confirmed after
            Ataimo reviews your request.
          </p>
          {authError && (
            <p role="alert" className="portal-error">
              {authError === "unavailable"
                ? "Sign-in is temporarily unavailable. Your public portfolio is still accessible. Please try again."
                : "We couldn’t complete sign-in. Try again, or ask Ataimo to check your account access."}
            </p>
          )}
          <a className="button primary" href="/login">
            Login <ArrowRight size={18} />
          </a>
          <p>
            Need an account? <a href="/signup">Sign up</a>
          </p>
        </section>
      </div>
    );
  if (!data)
    return (
      <div className="page portal-page">
        <h1>Your client workspace</h1>
        <p role="alert">{error}</p>
        <button className="button" onClick={refresh}>
          Try again
        </button>
      </div>
    );
  const { user, jobs, slots } = data;
  if (ownerOnly && !user.isOwner)
    return (
      <div className="page portal-page">
        <h1>This workspace is for the owner.</h1>
        <p>Your client account has its own private workspace.</p>
        <Link className="button primary" href="/portal">
          Open your workspace
        </Link>
      </div>
    );
  const zone = user.timezone;
  const job = jobs.find((j) => j.id === selected);
  const direct = conversations.find((c) => "direct:" + c.id === selected);
  const visible = jobs.filter((j) => filter === "all" || j.status === filter);
  const dayKey = (value: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  const offset = (month.getDay() + 6) % 7,
    days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const currentSlots = slots.filter((s) => dayKey(s.starts_at) === day);
  const readOnly =
    !user.isOwner &&
    (!user.roles.includes("client") || user.roles.includes("demo-viewer"));
  return (
    <div className="page portal-page">
      <div className="portal-heading">
        <div>
          <h1>{user.isOwner ? "Consultancy workspace" : "Your workspace"}</h1>
          <p>
            Welcome, {user.name}.{" "}
            {user.isOwner
              ? "Review requests and guide each engagement."
              : "From the first conversation to the finished work."}
          </p>
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="button" type="submit">
            Sign out
          </button>
        </form>
      </div>
      <div className="portal-meta">
        <span>
          {user.isOwner
            ? "Owner access"
            : readOnly
              ? "Read-only access"
              : "Client access"}
        </span>
        <span>{user.email}</span>
        <Link href="/status">Platform status</Link>
      </div>
      {readOnly && (
        <p className="portal-note">
          This account is read-only. Booking and messaging need a client
          invitation.
        </p>
      )}
      {error && (
        <p className="portal-error" role="alert">
          {error}{" "}
          <button onClick={refresh} className="portal-inline">
            <RefreshCw size={16} /> Retry
          </button>
        </p>
      )}
      {notice && (
        <p className="portal-success" role="status">
          {notice}
        </p>
      )}
      <nav className="workspace-navigation" aria-label="Workspace sections">
        {[
          "overview",
          "consultations",
          "messages",
          ...(user.isOwner ? ["mail"] : []),
          "profile",
        ].map((view) => (
          <button
            key={view}
            className="portal-filter"
            aria-pressed={section === view}
            onClick={() => setSection(view)}
          >
            {view === "overview"
              ? "Overview"
              : view === "mail"
                ? "Mailbox"
                : label(view)}
          </button>
        ))}
      </nav>
      {section === "overview" && (
        <section className="workspace-summary" aria-label="Engagement summary">
          {["requested", "booked", "active", "completed"].map((state) => (
            <button
              className="workspace-stat"
              key={state}
              onClick={() => {
                setFilter(state);
                setSection("consultations");
              }}
            >
              <strong>{jobs.filter((j) => j.status === state).length}</strong>
              <span>{label(state)}</span>
            </button>
          ))}
        </section>
      )}
      {section === "mail" && user.isOwner && <OwnerMail />}
      {section === "profile" && (
        <div className="workspace-profile">
          <section className="workspace-panel">
            <p className="eyebrow">Account details</p>
            <h2>{user.name}</h2>
            <p>{user.email}</p>
            <p>
              Your sign-in identity is managed securely by your login provider.
            </p>
            <p>
              <a className="button secondary" href="/api/auth/account">
                Manage sign-in, password and account security
              </a>
            </p>
            <p>
              Password recovery uses a verification link sent to your email.
              For social sign-in, manage your password with your social provider.
            </p>
            <form
              className="portal-form"
              onSubmit={(e) => {
                e.preventDefault();
                const values = new FormData(e.currentTarget);
                action({
                  action: "profile",
                  timezone: zone,
                  company: values.get("company"),
                  phone: values.get("phone"),
                });
              }}
            >
              <label htmlFor="profile-company">Company or organization</label>
              <input
                id="profile-company"
                name="company"
                maxLength={200}
                defaultValue={user.company}
              />
              <label htmlFor="profile-phone">Phone (optional)</label>
              <input
                id="profile-phone"
                name="phone"
                type="tel"
                maxLength={40}
                defaultValue={user.phone}
              />
              <button className="button primary" disabled={busy || readOnly}>
                {busy ? "Saving…" : "Save profile"}
              </button>
            </form>
            {user.isOwner && (
              <p>
                <Link href="/admin">Open your owner dashboard</Link>
              </p>
            )}
          </section>
          <WorkspaceDevice />
        </div>
      )}
      {section === "messages" && (
        <section className="workspace-panel">
          <div className="portal-section-heading">
            <div>
              <h2>Direct conversations</h2>
              <p>
                Talk privately before booking, or continue outside a
                consultation.
              </p>
            </div>
            {!user.isOwner && !readOnly && (
              <button
                className="button primary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const result = await api("/api/portal/conversations", {
                      method: "POST",
                    });
                    await refresh();
                    setMessages([]);
                    setChatLoading(true);
                    setSelected("direct:" + result.id);
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Message Ataimo
              </button>
            )}
          </div>
          <div className="portal-filters">
            {conversations.map((c) => (
              <button
                key={c.id}
                className="portal-filter"
                aria-pressed={selected === "direct:" + c.id}
                onClick={() => {
                  if (selected !== "direct:" + c.id) {
                    setMessages([]);
                    setText("");
                    nonce.current = null;
                    followChat.current = true;
                    setChatLoading(true);
                    setSelected("direct:" + c.id);
                  }
                }}
              >
                {user.isOwner ? c.name : "Your conversation with Ataimo"}
              </button>
            ))}
          </div>
          {!conversations.length && <p>No direct conversations yet.</p>}
        </section>
      )}
      <div
        className="portal-layout"
        hidden={!["overview", "consultations", "messages"].includes(section)}
      >
        <section className="portal-engagements">
          <div className="portal-section-heading">
            <h2>{user.isOwner ? "Client engagements" : "Your engagements"}</h2>
            <span>{jobs.length} total</span>
          </div>
          <div className="portal-filters" aria-label="Filter engagements">
            {[
              "all",
              "requested",
              "booked",
              "active",
              "completed",
              "cancelled",
            ].map((f) => (
              <button
                key={f}
                className="portal-filter"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "All work" : label(f)}
              </button>
            ))}
          </div>
          {!visible.length && (
            <div className="portal-empty">
              <h3>
                {jobs.length
                  ? "No engagements in this view."
                  : "Your next project starts here."}
              </h3>
              <p>
                {user.isOwner
                  ? "Publish consultation slots below, then invite a client."
                  : "Choose a consultation time below and tell me what you’re working on."}
              </p>
            </div>
          )}
          <div className="portal-job-list">
            {visible.map((item) => (
              <article
                className="portal-job"
                key={item.id}
                data-selected={item.id === selected}
              >
                <div className="portal-job-top">
                  <span className="portal-state" data-state={item.status}>
                    {label(item.status)}
                  </span>
                  {user.isOwner && <span>{item.client_name}</span>}
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <p className="portal-date">
                  {date(item.starts_at, zone)} · 30 minutes
                </p>
                <p>
                  {item.booking_status === "pending"
                    ? "Awaiting approval"
                    : label(item.booking_status)}
                </p>
                <div className="workspace-tasks">
                  {Boolean(item.tasks?.length) && (
                    <>
                      <p className="portal-note">
                        {item.tasks.filter((t) => t.completed).length} /{" "}
                        {item.tasks.length} tasks completed
                      </p>
                      <progress
                        aria-label={`${item.title} task progress`}
                        value={item.tasks.filter((t) => t.completed).length}
                        max={item.tasks.length}
                      />
                      {item.tasks.map((task) => (
                        <label className="workspace-task" key={task.id}>
                          <input
                            type="checkbox"
                            checked={task.completed}
                            disabled={
                              busy ||
                              !user.isOwner ||
                              !["booked", "active"].includes(item.status)
                            }
                            onChange={(e) =>
                              action({
                                action: "task-update",
                                jobId: item.id,
                                taskId: task.id,
                                completed: e.target.checked,
                              })
                            }
                          />
                          <span>{task.title}</span>
                        </label>
                      ))}
                    </>
                  )}
                  {user.isOwner &&
                    ["booked", "active"].includes(item.status) && (
                      <form
                        className="workspace-task-add"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const form = e.currentTarget;
                          const title = new FormData(form).get("title");
                          if (
                            await action({
                              action: "task-add",
                              jobId: item.id,
                              title,
                            })
                          )
                            form.reset();
                        }}
                      >
                        <label className="sr-only" htmlFor={`task-${item.id}`}>
                          New task for {item.title}
                        </label>
                        <input
                          id={`task-${item.id}`}
                          name="title"
                          placeholder="Add a deliverable or task"
                          required
                          maxLength={200}
                        />
                        <button className="button" disabled={busy}>
                          Add task
                        </button>
                      </form>
                    )}
                  {Boolean(item.history?.length) && (
                    <details>
                      <summary>Engagement timeline</summary>
                      {item.history.map((h) => (
                        <p className="portal-date" key={h.id}>
                          {label(h.status)} · {date(h.created_at, zone)}
                        </p>
                      ))}
                    </details>
                  )}
                </div>
                <div className="portal-job-actions">
                  <button
                    className="button"
                    onClick={() => {
                      setSection("messages");
                      if (selected !== item.id) {
                        followChat.current = true;
                        setChatLoading(true);
                        setMessages([]);
                        setChatError("");
                        setText("");
                        nonce.current = null;
                        setSelected(item.id);
                      }
                    }}
                    aria-pressed={selected === item.id}
                  >
                    <MessageSquare size={16} /> Open conversation
                  </button>
                  {!user.isOwner &&
                    !readOnly &&
                    item.status === "requested" && (
                      <button
                        className="button"
                        disabled={busy}
                        onClick={() =>
                          action({ action: "cancel-request", jobId: item.id })
                        }
                      >
                        Withdraw request
                      </button>
                    )}
                  {user.isOwner && item.booking_status === "pending" && (
                    <>
                      <button
                        className="button primary"
                        disabled={busy}
                        onClick={() =>
                          action({
                            action: "decision",
                            bookingId: item.booking_id,
                            decision: "approved",
                          })
                        }
                      >
                        Approve
                      </button>
                      <button
                        className="button"
                        disabled={busy}
                        onClick={() =>
                          action({
                            action: "decision",
                            bookingId: item.booking_id,
                            decision: "declined",
                          })
                        }
                      >
                        Decline
                      </button>
                    </>
                  )}
                  {user.isOwner && item.status === "booked" && (
                    <button
                      className="button primary"
                      disabled={busy}
                      onClick={() =>
                        action({
                          action: "job-status",
                          jobId: item.id,
                          status: "active",
                        })
                      }
                    >
                      Start engagement
                    </button>
                  )}
                  {user.isOwner && item.status === "active" && (
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() =>
                        action({
                          action: "job-status",
                          jobId: item.id,
                          status: "completed",
                        })
                      }
                    >
                      Mark completed
                    </button>
                  )}
                  {user.isOwner &&
                    ["requested", "booked", "active"].includes(item.status) && (
                      <button
                        className="button"
                        disabled={busy}
                        onClick={() =>
                          action({
                            action: "job-status",
                            jobId: item.id,
                            status: "cancelled",
                          })
                        }
                      >
                        Cancel job
                      </button>
                    )}
                </div>
              </article>
            ))}
          </div>
        </section>
        <aside
          className="portal-conversation"
          aria-label="Private job conversation"
        >
          <h2>
            {job
              ? job.title
              : direct
                ? user.isOwner
                  ? direct.name
                  : "Your conversation with Ataimo"
                : "Private conversation"}
          </h2>
          {!job && !direct ? (
            <div className="portal-empty">
              <MessageSquare size={28} />
              <p>
                Open an engagement to see its conversation. Only you and Ataimo
                can access a client’s thread.
              </p>
            </div>
          ) : (
            <>
              <p>Messages are saved privately and refresh every few seconds.</p>
              <div
                className="portal-messages"
                onScroll={(e) => {
                  const node = e.currentTarget;
                  followChat.current =
                    node.scrollHeight - node.scrollTop - node.clientHeight < 80;
                }}
                role="log"
                aria-label="Conversation messages"
                aria-live="polite"
              >
                {chatLoading && <p role="status">Loading conversation…</p>}
                {!chatLoading && !messages.length && (
                  <p>No messages yet. Start the conversation.</p>
                )}
                {messages.map((m) => (
                  <article
                    className="portal-message"
                    data-mine={m.mine}
                    key={m.id}
                  >
                    <div>
                      <strong>{m.mine ? "You" : m.sender_name}</strong>
                      <time dateTime={m.created_at}>
                        {date(m.created_at, zone)}
                      </time>
                    </div>
                    <p>{m.body}</p>
                  </article>
                ))}
                <div ref={chatEnd} />
              </div>
              {chatError && (
                <p role="alert" className="portal-error">
                  {chatError}
                </p>
              )}
              {["completed", "cancelled"].includes(job?.status || "") ||
              readOnly ? (
                <p className="portal-note">This conversation is read-only.</p>
              ) : (
                <form onSubmit={send} className="portal-compose">
                  <label htmlFor="chat-message">Your message</label>
                  <textarea
                    id="chat-message"
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      nonce.current = null;
                    }}
                    maxLength={4000}
                    required
                    rows={3}
                    placeholder="Share a question or an update…"
                  />
                  <button
                    className="button primary"
                    disabled={busy || !text.trim()}
                  >
                    {busy ? "Saving…" : "Send message"} <ArrowRight size={16} />
                  </button>
                </form>
              )}
            </>
          )}
        </aside>
      </div>
      <section
        className="portal-scheduling"
        hidden={!["overview", "consultations"].includes(section)}
      >
        <div className="portal-section-heading">
          <div>
            <h2>
              <CalendarDays size={24} />{" "}
              {user.isOwner
                ? "Consultation availability"
                : "Request a consultation"}
            </h2>
            <p>
              30 minutes to explore your architecture, API platform, or
              engineering challenge. Requests require approval.
            </p>
          </div>
        </div>
        <div className="portal-calendar-layout">
          <div>
            <label htmlFor="portal-zone">Display timezone</label>
            <select
              id="portal-zone"
              value={zone}
              disabled={busy}
              onChange={(e) =>
                action({ action: "profile", timezone: e.target.value })
              }
            >
              {[...new Set([zone, ...Intl.supportedValuesOf("timeZone")])].map(
                (z) => (
                  <option key={z}>{z}</option>
                ),
              )}
            </select>
            <div className="portal-month">
              <button
                className="portal-icon"
                aria-label="Previous month"
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() - 1, 1),
                  )
                }
              >
                <ChevronLeft />
              </button>
              <h3>
                {month.toLocaleDateString("en", {
                  month: "long",
                  year: "numeric",
                })}
              </h3>
              <button
                className="portal-icon"
                aria-label="Next month"
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() + 1, 1),
                  )
                }
              >
                <ChevronRight />
              </button>
            </div>
            <div className="portal-calendar">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <span key={d}>{d}</span>
              ))}
              {Array.from({ length: offset }, (_, i) => (
                <span key={"blank" + i} />
              ))}
              {Array.from({ length: days }, (_, i) => {
                const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
                const available = slots.some(
                  (s) => dayKey(s.starts_at) === key,
                );
                return (
                  <button
                    key={key}
                    disabled={!available}
                    aria-pressed={day === key}
                    aria-label={`${month.toLocaleDateString("en", { month: "long" })} ${i + 1}${available ? ", available slots" : ", no slots"}`}
                    onClick={() => {
                      setDay(key);
                      setSlotId("");
                    }}
                  >
                    {i + 1}
                    {available && <span className="portal-slot-dot" />}
                  </button>
                );
              })}
            </div>
            <p className="portal-note">
              Highlighted days have available times. A pending request does not
              reserve a slot.
            </p>
          </div>
          <div>
            {user.isOwner ? (
              <form
                className="portal-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = e.currentTarget;
                  const value = new FormData(f).get("startsAt") as string;
                  if (
                    await action({
                      action: "availability",
                      startsAt: new Date(value).toISOString(),
                    })
                  )
                    f.reset();
                }}
              >
                <h3>Publish a consultation slot</h3>
                <label htmlFor="availability-start">Start date and time</label>
                <input
                  id="availability-start"
                  name="startsAt"
                  type="datetime-local"
                  required
                />
                <p>
                  Enter the time in your device timezone:{" "}
                  {Intl.DateTimeFormat().resolvedOptions().timeZone}.
                </p>
                <button className="button primary" disabled={busy}>
                  {busy ? "Publishing…" : "Publish 30-minute slot"}
                </button>
                <h3>Upcoming availability</h3>
                {slots.length ? (
                  slots
                    .slice(0, 8)
                    .map((s) => <p key={s.id}>{date(s.starts_at, zone)}</p>)
                ) : (
                  <p>No slots published yet.</p>
                )}
              </form>
            ) : (
              <form onSubmit={request} className="portal-form">
                <h3>{day ? "Choose a time" : "Choose an available day"}</h3>
                <div className="portal-times">
                  {currentSlots.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="portal-filter"
                      aria-pressed={slotId === s.id}
                      onClick={() => setSlotId(s.id)}
                    >
                      {new Intl.DateTimeFormat("en", {
                        timeZone: zone,
                        timeStyle: "short",
                      }).format(new Date(s.starts_at))}
                    </button>
                  ))}
                </div>
                {!slots.length && (
                  <p>
                    No consultation times are published yet.{" "}
                    <Link href="/contact">Contact Ataimo</Link> to arrange a
                    time.
                  </p>
                )}
                <label htmlFor="request-title">
                  What would you like to work on?
                </label>
                <input
                  id="request-title"
                  name="title"
                  required
                  minLength={3}
                  maxLength={200}
                  placeholder="An API platform architecture review"
                />
                <label htmlFor="request-description">A little context</label>
                <textarea
                  id="request-description"
                  name="description"
                  required
                  minLength={10}
                  maxLength={4000}
                  rows={4}
                  placeholder="Your goals, current setup, and where you need help…"
                />
                <button
                  className="button primary"
                  disabled={busy || !slotId || readOnly}
                >
                  {busy ? "Submitting…" : "Request consultation"}{" "}
                  <ArrowRight size={16} />
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
      {data.notifications.length > 0 && (
        <section className="portal-updates">
          <div className="portal-section-heading">
            <h2>Recent updates</h2>
            <button
              className="button"
              disabled={busy || readOnly}
              onClick={() => action({ action: "notifications-read" })}
            >
              Mark read
            </button>
          </div>
          {data.notifications.slice(0, 5).map((n) => (
            <p key={n.id}>
              <strong>{n.title}</strong> — {label(n.kind)}
            </p>
          ))}
        </section>
      )}
    </div>
  );
}
