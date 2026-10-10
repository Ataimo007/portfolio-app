"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import {
  durationEnd,
  durationLabel,
  type DurationUnit,
} from "@/lib/consultation-duration";
import DurationFields from "./duration-fields";
import ProfileSettings from "./profile-settings";
import OwnerMail from "./owner-mail";
import UserManagement from "./user-management";
import MessageBody from "./message-body";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  LayoutDashboard,
  UserRound,
  Users,
  Bold,
  Italic,
  Code,
  List,
  X,
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
  client_id: string;
  client_messages?: number;
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
  reserved?: { starts_at: string; ends_at: string }[];
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
  const [messageView, setMessageView] = useState("chat");
  const [consultationFocus, setConsultationFocus] = useState("");
  const composer = useRef<HTMLTextAreaElement>(null);
  const [conversations, setConversations] = useState<
    { id: string; client_id: string; name: string; preview: string }[]
  >([]);
  const [now, setNow] = useState(() => Date.now());
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
  const [requestedStart, setRequestedStart] = useState("");
  const [duration, setDuration] = useState(30);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("minutes");
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
      setNow(Date.now());
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
        } else if (workspace.user.isOwner) {
          setSection("messages");
          setMessageView("mail");
        }
      }

      if (
        params.get("view") === "accounts" &&
        notificationTarget.current !== "accounts"
      ) {
        notificationTarget.current = "accounts";
        setSection("accounts");
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
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  async function startClientConversation() {
    setChatLoading(true);
    setChatError("");
    try {
      const result = await api("/api/portal/conversations", { method: "POST" });
      selectThread("direct:" + result.id);
      await refresh();
    } catch (error) {
      setChatError((error as Error).message);
      setChatLoading(false);
    }
  }
  function selectThread(id: string) {
    if (id === selected) return;
    setMessages([]);
    setText("");
    setChatError("");
    nonce.current = null;
    followChat.current = true;
    setChatLoading(true);
    setSelected(id);
  }
  function openConsultation(id: string) {
    window.scrollTo({ top: 0, behavior: "instant" });
    setFilter("all");
    setConsultationFocus(id);
    setSection("consultations");
  }
  function formatMessage(marker: string) {
    const field = composer.current;
    if (!field) return;
    const start = field.selectionStart,
      end = field.selectionEnd;
    const selection =
      text.slice(start, end) || (marker === "- " ? "List item" : "text");
    const replacement =
      marker === "- "
        ? selection
            .split("\n")
            .map((line) => "- " + line)
            .join("\n")
        : marker + selection + marker;
    setText(text.slice(0, start) + replacement + text.slice(end));
    nonce.current = null;
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(start, start + replacement.length);
    });
  }
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
        startsAt: requestedStart,
        duration,
        durationUnit,
        title: values.get("title"),
        description: values.get("description"),
      })
    ) {
      form.reset();
      setSlotId("");
      setRequestedStart("");
    }
  }
  async function send(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    setChatError("");
    setNotice("");
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
  const visible = jobs.filter(
    (j) =>
      (!consultationFocus || j.id === consultationFocus) &&
      (filter === "all" || j.status === filter),
  );
  const relatedJobs = jobs.filter((j) =>
    direct
      ? j.client_id === direct.client_id
      : job
        ? j.client_id === job.client_id
        : false,
  );
  const threadChoices = [
    ...conversations.map((c) => ({
      id: "direct:" + c.id,
      clientId: c.client_id,
      name: c.name,
      preview: c.preview,
    })),
    ...jobs
      .filter(
        (j) =>
          (j.client_messages || 0) > 0 &&
          !conversations.some((c) => c.client_id === j.client_id) &&
          !jobs.some(
            (other, i) =>
              i < jobs.indexOf(j) &&
              (other.client_messages || 0) > 0 &&
              other.client_id === j.client_id,
          ),
      )
      .map((j) => ({
        id: j.id,
        clientId: j.client_id,
        name: j.client_name,
        preview: j.title,
      })),
  ];
  const views = [
    { id: "overview", title: "Overview", icon: LayoutDashboard },
    { id: "consultations", title: "Consultations", icon: CalendarDays },
    { id: "messages", title: "Messages", icon: MessageSquare },
    ...(user.isOwner ? [{ id: "users", title: "Users", icon: Users }] : []),
    { id: "accounts", title: "Account", icon: UserRound },
  ];
  const dayFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dayKey = (value: string) => dayFormatter.format(new Date(value));
  const offset = (month.getDay() + 6) % 7,
    days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const startOptions = (key: string) => {
    const result: (Slot & { time: string })[] = [];
    for (const slot of slots) {
      const slotStart = new Date(slot.starts_at).getTime();
      const dayStart = new Date(key + "T00:00:00Z").getTime();
      const from = Math.max(slotStart, now + 30 * 60000, dayStart - 86400000);
      const until = Math.min(
        new Date(slot.ends_at).getTime(),
        new Date(key + "T00:00:00Z").getTime() + 2 * 86400000,
      );
      for (
        let time =
          slotStart + Math.ceil((from - slotStart) / 1800000) * 1800000;
        time < until;
        time += 1800000
      ) {
        const startsAt = new Date(time).toISOString();
        if (dayKey(startsAt) !== key) continue;
        const endsAt = durationEnd(startsAt, duration, durationUnit);
        if (new Date(endsAt) > new Date(slot.ends_at)) continue;
        if (
          data.reserved?.some(
            (b) =>
              new Date(b.starts_at) < new Date(endsAt) &&
              new Date(b.ends_at).getTime() > time,
          )
        )
          continue;
        result.push({ ...slot, time: startsAt });
      }
    }
    return result;
  };
  const currentSlots = day ? startOptions(day) : [];
  const readOnly =
    !user.isOwner &&
    (!user.roles.includes("client") || user.roles.includes("demo-viewer"));
  return (
    <div className="page portal-page">
      <nav
        className="workspace-navigation"
        aria-label="Workspace sections"
        role="tablist"
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
            return;
          event.preventDefault();
          const index = views.findIndex((v) => v.id === section);
          const next =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? views.length - 1
                : (index +
                    (event.key === "ArrowRight" ? 1 : -1) +
                    views.length) %
                  views.length;
          setSection(views[next].id);
          document.getElementById("workspace-tab-" + views[next].id)?.focus();
        }}
      >
        {views.map(({ id, title, icon: Icon }) => (
          <button
            key={id}
            id={"workspace-tab-" + id}
            role="tab"
            aria-selected={section === id}
            aria-controls="workspace-content"
            tabIndex={section === id ? 0 : -1}
            onClick={() => {
              setSection(id);
              window.scrollTo({ top: 0, behavior: "instant" });
            }}
          >
            <Icon size={20} aria-hidden="true" />
            <span>{title}</span>
          </button>
        ))}
      </nav>
      {notice && (
        <p className="portal-success" role="status">
          {notice}
          <button
            className="portal-inline"
            aria-label="Dismiss confirmation"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </p>
      )}
      <div
        id="workspace-content"
        role="tabpanel"
        aria-labelledby={"workspace-tab-" + section}
        tabIndex={0}
      >
        {section === "overview" && (
          <>
            <div className="portal-heading">
              <div>
                <h1>
                  {user.isOwner ? "Consultancy workspace" : "Your workspace"}
                </h1>
                <p>
                  Welcome, {user.name}.{" "}
                  {user.isOwner
                    ? "Review requests and guide each engagement."
                    : "From the first conversation to the finished work."}
                </p>
              </div>
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
          </>
        )}
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

        {section === "overview" && (
          <section
            className="workspace-summary"
            aria-label="Engagement summary"
          >
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
        {section === "messages" && user.isOwner && (
          <div className="portal-section-heading message-channel-heading">
            <h2>Messages</h2>
            <label className="message-view-switch">
              Channel
              <select
                aria-label="Message channel"
                value={messageView}
                onChange={(e) => setMessageView(e.target.value)}
              >
                <option value="chat">Client conversations</option>
                <option value="mail">Mailbox</option>
              </select>
            </label>
          </div>
        )}
        {section === "messages" && messageView === "mail" && user.isOwner && (
          <OwnerMail />
        )}
        {section === "users" && user.isOwner && (
          <UserManagement
            onChat={(id) => {
              setMessageView("chat");
              setSection("messages");
              selectThread("direct:" + id);
              void refresh();
            }}
            onConsultation={openConsultation}
          />
        )}
        {section === "accounts" && (
          <ProfileSettings
            user={user}
            busy={busy}
            readOnly={readOnly}
            onUpdated={refresh}
            onSave={(values) => action({ action: "profile", ...values })}
          />
        )}
        <div
          className="portal-layout"
          hidden={!["overview", "consultations"].includes(section)}
        >
          <section className="portal-engagements">
            <div className="portal-section-heading">
              <h2>
                {user.isOwner ? "Client engagements" : "Your engagements"}
              </h2>
              <span>{jobs.length} total</span>
            </div>
            {consultationFocus && (
              <button
                className="button"
                onClick={() => setConsultationFocus("")}
              >
                All consultations
              </button>
            )}
            <div className="engagement-filter">
              <label htmlFor="engagement-status">Engagement status</label>
              <select
                id="engagement-status"
                value={filter}
                onChange={(event) => {
                  setConsultationFocus("");
                  setFilter(event.target.value);
                }}
              >
                {[
                  "all",
                  "requested",
                  "booked",
                  "active",
                  "completed",
                  "cancelled",
                ].map((status) => (
                  <option key={status} value={status}>
                    {status === "all" ? "All work" : label(status)}
                  </option>
                ))}
              </select>
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
                    {date(item.starts_at, zone)} ·{" "}
                    {durationLabel(item.starts_at, item.ends_at)}
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
                          <label
                            className="sr-only"
                            htmlFor={`task-${item.id}`}
                          >
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
                        setMessageView("chat");
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
                      ["requested", "booked", "active"].includes(
                        item.status,
                      ) && (
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
        </div>
        {section === "messages" &&
          (!user.isOwner || messageView === "chat") && (
            <div className="workspace-chat" data-selected={Boolean(selected)}>
              {
                <aside
                  className="client-conversations"
                  aria-label={
                    user.isOwner ? "Client conversations" : "Your conversations"
                  }
                >
                  <h3>Conversations</h3>
                  <ul>
                    {threadChoices.map((c) => (
                      <li key={c.id}>
                        <button
                          aria-pressed={
                            selected === c.id ||
                            Boolean(job && c.clientId === job.client_id)
                          }
                          onClick={() => selectThread(c.id)}
                        >
                          <strong>{user.isOwner ? c.name : "Ataimo"}</strong>
                          <span>{c.preview || "Start a conversation"}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {chatError && !selected && (
                    <p className="portal-error" role="alert">
                      {chatError}
                    </p>
                  )}
                  {!threadChoices.length &&
                    (user.isOwner ? (
                      <p>
                        No conversations yet. Open Users to start one with a
                        client.
                      </p>
                    ) : (
                      <button
                        disabled={chatLoading || readOnly}
                        onClick={() => void startClientConversation()}
                      >
                        <strong>Ataimo</strong>
                        <span>
                          {chatLoading
                            ? "Opening conversation…"
                            : "Start a conversation"}
                        </span>
                      </button>
                    ))}
                </aside>
              }
              <aside
                className="portal-conversation"
                aria-label="Private job conversation"
              >
                <div className="chat-heading">
                  <h2>
                    {job
                      ? user.isOwner
                        ? job.client_name
                        : "Your conversation with Ataimo"
                      : direct
                        ? user.isOwner
                          ? direct.name
                          : "Your conversation with Ataimo"
                        : "Private conversation"}
                  </h2>
                  {selected && (
                    <button
                      className="portal-icon chat-back"
                      aria-label="Back to conversations"
                      onClick={() => {
                        setSelected("");
                        setMessages([]);
                      }}
                    >
                      <ChevronLeft />
                    </button>
                  )}
                  {relatedJobs.length > 0 && (
                    <details className="chat-consultations">
                      <summary aria-label="View related consultations">
                        <CalendarDays size={20} />
                      </summary>
                      <div>
                        {relatedJobs.map((j) => (
                          <button
                            className="button"
                            key={j.id}
                            onClick={() => openConsultation(j.id)}
                          >
                            {j.title} · {label(j.status)}
                          </button>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
                {relatedJobs.length > 0 && (
                  <label className="thread-switch">
                    Conversation
                    <select
                      aria-label="Conversation thread"
                      value={selected}
                      onChange={(e) => selectThread(e.target.value)}
                    >
                      {direct && (
                        <option value={"direct:" + direct.id}>
                          General conversation
                        </option>
                      )}
                      {!direct &&
                        conversations
                          .filter((c) => c.client_id === job?.client_id)
                          .map((c) => (
                            <option key={c.id} value={"direct:" + c.id}>
                              General conversation
                            </option>
                          ))}
                      {relatedJobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.title}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {!job && !direct ? (
                  <div className="portal-empty">
                    <MessageSquare size={28} />
                    <p>
                      Choose a conversation to open your messages and chat
                      history.
                    </p>
                  </div>
                ) : (
                  <>
                    <p>
                      Messages are saved privately and refresh every few
                      seconds.
                    </p>
                    <div
                      className="portal-messages"
                      onScroll={(e) => {
                        const node = e.currentTarget;
                        followChat.current =
                          node.scrollHeight -
                            node.scrollTop -
                            node.clientHeight <
                          80;
                      }}
                      role="log"
                      aria-label="Conversation messages"
                      aria-live="polite"
                    >
                      {chatLoading && (
                        <p role="status">Loading conversation…</p>
                      )}
                      {!chatLoading && !messages.length && (
                        <p>No messages yet. Write your first message below.</p>
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
                          <MessageBody text={m.body} />
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
                      <p className="portal-note">
                        This conversation is read-only.
                      </p>
                    ) : (
                      <form onSubmit={send} className="portal-compose">
                        <label htmlFor="chat-message">Your message</label>
                        <textarea
                          ref={composer}
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
                        <div className="chat-composer-actions">
                          <div
                            className="chat-formatting"
                            role="toolbar"
                            aria-label="Message formatting"
                          >
                            {[
                              { label: "Bold", icon: Bold, marker: "**" },
                              { label: "Italic", icon: Italic, marker: "*" },
                              { label: "Code", icon: Code, marker: "`" },
                              {
                                label: "Bullet list",
                                icon: List,
                                marker: "- ",
                              },
                            ].map(({ label, icon: Icon, marker }) => (
                              <button
                                key={label}
                                type="button"
                                className="portal-icon"
                                aria-label={label}
                                onClick={() => formatMessage(marker)}
                              >
                                <Icon size={18} />
                              </button>
                            ))}
                          </div>
                          <button
                            className="button primary"
                            disabled={busy || !text.trim()}
                          >
                            {busy ? "Saving…" : "Send message"}{" "}
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                )}
              </aside>{" "}
            </div>
          )}

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
                Choose a time and duration to explore your architecture, API
                platform, or engineering challenge. Every request requires
                approval.
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
                {[
                  ...new Set([zone, ...Intl.supportedValuesOf("timeZone")]),
                ].map((z) => (
                  <option key={z}>{z}</option>
                ))}
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
                  const available = startOptions(key).length > 0;
                  return (
                    <button
                      key={key}
                      disabled={!available}
                      aria-pressed={day === key}
                      aria-label={`${month.toLocaleDateString("en", { month: "long" })} ${i + 1}${available ? ", available slots" : ", no slots"}`}
                      onClick={() => {
                        setDay(key);
                        setSlotId("");
                        setRequestedStart("");
                      }}
                    >
                      {i + 1}
                      {available && <span className="portal-slot-dot" />}
                    </button>
                  );
                })}
              </div>
              <p className="portal-note">
                Highlighted days have available times. A pending request does
                not reserve a slot.
              </p>
            </div>
            <div>
              {user.isOwner ? (
                <form
                  className="portal-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = e.currentTarget;
                    const values = new FormData(f);
                    const value = values.get("startsAt") as string;
                    if (
                      await action({
                        action: "availability",
                        startsAt: new Date(value).toISOString(),
                        duration: Number(values.get("duration")),
                        durationUnit: values.get("durationUnit"),
                      })
                    )
                      f.reset();
                  }}
                >
                  <h3>Publish a consultation slot</h3>
                  <label htmlFor="availability-start">
                    Start date and time
                  </label>
                  <input
                    id="availability-start"
                    name="startsAt"
                    type="datetime-local"
                    required
                  />
                  <DurationFields />
                  <p>
                    Enter the time in your device timezone:{" "}
                    {Intl.DateTimeFormat().resolvedOptions().timeZone}.
                  </p>
                  <button className="button primary" disabled={busy}>
                    {busy ? "Publishing…" : "Publish availability"}
                  </button>
                  <h3>Upcoming availability</h3>
                  {slots.length ? (
                    slots.slice(0, 8).map((s) => (
                      <p key={s.id}>
                        {date(s.starts_at, zone)} — {date(s.ends_at, zone)}
                      </p>
                    ))
                  ) : (
                    <p>No slots published yet.</p>
                  )}
                </form>
              ) : (
                <form onSubmit={request} className="portal-form">
                  <h3>{day ? "Choose a time" : "Choose an available day"}</h3>
                  <DurationFields
                    value={duration}
                    unit={durationUnit}
                    onChange={(value, unit) => {
                      setDuration(value);
                      setDurationUnit(unit);
                      setSlotId("");
                      setRequestedStart("");
                    }}
                  />
                  <div className="portal-times">
                    {currentSlots.map((s) => (
                      <button
                        key={s.id + s.time}
                        type="button"
                        className="portal-filter"
                        aria-pressed={
                          slotId === s.id && requestedStart === s.time
                        }
                        onClick={() => {
                          setSlotId(s.id);
                          setRequestedStart(s.time);
                        }}
                      >
                        {new Intl.DateTimeFormat("en", {
                          timeZone: zone,
                          timeStyle: "short",
                        }).format(new Date(s.time))}
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
        {section === "overview" &&
          !user.isOwner &&
          data.notifications.length > 0 && (
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
    </div>
  );
}
